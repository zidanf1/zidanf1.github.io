/* ══════════════════════════════════════════
   DATABASE (localStorage)
══════════════════════════════════════════ */
const DB = {
  inv: {},   // { boxCode: [bagCode, ...] }
  loc: {},   // { boxCode: lokasiCode }
  tx:  [],   // transaction log
  out: 0,    // total bag keluar

  save() {
    try {
      localStorage.setItem('wms3', JSON.stringify({
        i: this.inv,
        l: this.loc,
        t: this.tx,
        o: this.out
      }));
    } catch (e) {}
  },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('wms3') || '{}');
      this.inv = d.i || {};
      this.loc = d.l || {};
      this.tx  = d.t || [];
      this.out = d.o || 0;
    } catch (e) {}
  }
};

DB.load();

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let streams  = {};
let siBox    = null;
let siBags   = [];
let sbLokasi = 'Temporary'; // default lokasi
let sbBoxes  = [];
let soBags   = [];

// Upload context: { page, boxes, bags, lokasi }
let uploadCtx = null;

/* ══════════════════════════════════════════
   LOKASI OPTIONS
   Rak: Ax, Bx, Cx — Temporary sebagai default
══════════════════════════════════════════ */
const LOKASI_LIST = [
  { code: 'Temporary', label: 'Temporary', icon: 'ti-clock', isTemp: true },
  { code: 'A1', label: 'A1', icon: 'ti-layout-rows' },
  { code: 'A2', label: 'A2', icon: 'ti-layout-rows' },
  { code: 'A3', label: 'A3', icon: 'ti-layout-rows' },
  { code: 'B1', label: 'B1', icon: 'ti-layout-rows' },
  { code: 'B2', label: 'B2', icon: 'ti-layout-rows' },
  { code: 'B3', label: 'B3', icon: 'ti-layout-rows' },
  { code: 'C1', label: 'C1', icon: 'ti-layout-rows' },
  { code: 'C2', label: 'C2', icon: 'ti-layout-rows' },
  { code: 'C3', label: 'C3', icon: 'ti-layout-rows' },
];

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
const now = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

function getType(c) {
  c = c.trim();
  if (/^0211\d{6,}$/.test(c))  return 'bag';
  if (/^#?\d{1,5}$/.test(c))   return 'box';
  return null;
}

function norm(c) {
  c = c.trim();
  const t = getType(c);
  if (t === 'box') {
    const digits = c.replace(/^#/, '');
    return '#' + digits.padStart(5, '0');
  }
  return c;
}

function flash(id, type, html, dur = 3000) {
  const icons = { ok: 'circle-check', err: 'circle-x', warn: 'alert-triangle', info: 'info-circle' };
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <div class="flash ${type}">
      <i class="ti ti-${icons[type]}" aria-hidden="true"></i>
      <span>${html}</span>
    </div>`;
  if (dur) setTimeout(() => { if (el) el.innerHTML = ''; }, dur);
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function goPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  btn.classList.add('active');
  stopAllCams();
}

/* ══════════════════════════════════════════
   TOP BADGE
══════════════════════════════════════════ */
function updateTopBadge() {
  const bags = Object.values(DB.inv).reduce((s, a) => s + a.length, 0);
  const el = document.getElementById('total-bag-top');
  if (el) el.textContent = bags + ' bag';
}

/* ══════════════════════════════════════════
   BAG UNIQUENESS HELPER
══════════════════════════════════════════ */
function findBagInDB(bagCode) {
  for (const [box, bags] of Object.entries(DB.inv)) {
    if (bags.includes(bagCode)) return { exists: true, box };
  }
  return { exists: false, box: null };
}

/* ══════════════════════════════════════════
   SCAN COUNTERS — tampilkan jumlah box & bag
══════════════════════════════════════════ */
function updateSICounters() {
  const totalBoxes = siBox ? 1 : 0;
  const totalBags = siBags.length;
  const elBoxes = document.getElementById('si-counter-boxes');
  const elBags  = document.getElementById('si-counter-bags');
  if (elBoxes) elBoxes.textContent = totalBoxes;
  if (elBags)  elBags.textContent  = totalBags;
}

function updateSOCounters() {
  const el = document.getElementById('so-counter-bags');
  if (el) el.textContent = soBags.length;
}

function updateSBCounters() {
  const el = document.getElementById('sb-counter-boxes');
  if (el) el.textContent = sbBoxes.length;
}

/* ══════════════════════════════════════════
   SCAN IN
══════════════════════════════════════════ */
function procSI() {
  const raw = document.getElementById('si-input').value.trim();
  if (!raw) return;

  const t = getType(raw);
  const c = norm(raw);
  document.getElementById('si-input').value = '';

  if (t === 'box') {
    // Auto-save sesi box sebelumnya jika ada
    let autoSaveMsg = null;
    if (siBox && siBags.length > 0) {
      const prevBox = siBox;
      const saved = autoSaveSI();
      autoSaveMsg = saved + ' bag otomatis disimpan ke box <strong>' + prevBox + '</strong>';
    }

    siBox  = c;
    siBags = [];

    const st = document.getElementById('si-state');
    st.className = 'state-pill set';
    st.querySelector('.sp-icon').className = 'sp-icon set';
    st.querySelector('.sp-icon').innerHTML = '<i class="ti ti-box" aria-hidden="true"></i>';

    const v = document.getElementById('si-box-val');
    v.className = 'sp-value set';
    v.textContent = c;

    let sub = st.querySelector('.sp-sub');
    if (!sub) {
      sub = document.createElement('div');
      sub.className = 'sp-sub';
      v.after(sub);
    }
    sub.textContent = '0 bag ditambahkan';

    if (!st.querySelector('.sp-clear')) {
      const b = document.createElement('button');
      b.className = 'sp-clear';
      b.innerHTML = '<i class="ti ti-x"></i>';
      b.onclick = () => { siBox = null; siBags = []; resetSIState(); };
      st.appendChild(b);
    }

    renderSIList();
    siUpdateSub();
    siUpdateBtn();
    updateSICounters();

    if (autoSaveMsg) {
      flash('si-msg', 'ok', autoSaveMsg + ' · Box baru: <strong>' + c + '</strong>', 5000);
    } else {
      flash('si-msg', 'info', 'Box aktif: <strong>' + c + '</strong> — scan bag sekarang');
    }
    return;
  }

  if (t === 'bag') {
    if (!siBox) { flash('si-msg', 'warn', 'Scan kode box terlebih dahulu'); return; }

    // Cek duplikat dalam sesi aktif
    if (siBags.find(b => b.c === c)) {
      flash('si-msg', 'warn', 'Bag <strong>' + c + '</strong> sudah ada dalam daftar sesi ini');
      return;
    }

    // Cek duplikat ke server
    checkBagDuplicate(c, siBox, function(isDuplicate, existingBox, errMsg) {
      if (errMsg) {
        // Jika gagal request, lanjutkan saja (fallback)
        siBags.push({ c, tm: now() });
        renderSIList();
        siUpdateSub();
        siUpdateBtn();
        updateSICounters();
        flash('si-msg', 'warn', 'Check server gagal, bag ditambahkan: <strong>' + c + '</strong>');
        return;
      }
      if (isDuplicate) {
        if (existingBox === siBox) {
          flash('si-msg', 'err', 'Bag <strong>' + c + '</strong> sudah tercatat di box ini sebelumnya');
        } else {
          flash('si-msg', 'err', 'Bag <strong>' + c + '</strong> sudah ada di box <strong>' + existingBox + '</strong> — tidak bisa double');
        }
        return;
      }

      siBags.push({ c, tm: now() });
      renderSIList();
      siUpdateSub();
      siUpdateBtn();
      updateSICounters();
      flash('si-msg', 'ok', 'Ditambahkan: <strong>' + c + '</strong>');
    });
    return;
  }

  flash('si-msg', 'err', 'Format tidak dikenal: ' + raw, 5000);
}

/* ── Check Bag Duplicate via Server ── */
function checkBagDuplicate(bagCode, currentBox, callback) {
  fetch('config/check_bag.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bag: bagCode, box: currentBox })
  })
  .then(r => r.json())
  .then(data => {
    // Response: { duplicate: bool, box: string|null }
    callback(data.duplicate, data.box || null, null);
  })
  .catch(() => {
    callback(false, null, 'network_error');
  });
}

function resetSIState() {
  const st = document.getElementById('si-state');
  st.className = 'state-pill idle';
  st.querySelector('.sp-icon').className = 'sp-icon idle';
  st.querySelector('.sp-icon').innerHTML = '<i class="ti ti-box"></i>';

  const v = document.getElementById('si-box-val');
  v.className = 'sp-value idle';
  v.textContent = 'Scan kode box terlebih dahulu';

  const sub = st.querySelector('.sp-sub');
  if (sub) sub.remove();
  const clr = st.querySelector('.sp-clear');
  if (clr) clr.remove();

  renderSIList();
  siUpdateBtn();
  updateSICounters();
}

function siUpdateSub() {
  const sub = document.getElementById('si-state').querySelector('.sp-sub');
  if (sub) sub.textContent = siBags.length + ' bag ditambahkan';
}

function renderSIList() {
  const el = document.getElementById('si-list');
  document.getElementById('si-cnt').textContent = siBags.length;

  if (!siBags.length) {
    el.innerHTML = '<div class="empty"><i class="ti ti-shopping-bag"></i>Belum ada bag</div>';
    return;
  }

  el.innerHTML = '<div class="items">' + siBags.map((b, i) => `
    <div class="item">
      <i class="ti ti-shopping-bag"></i>
      <span class="item-code">${b.c}</span>
      <span class="item-box">${b.tm}</span>
      <button class="item-del" onclick="siRem(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('') + '</div>';
}

function siRem(i) {
  siBags.splice(i, 1);
  renderSIList();
  siUpdateSub();
  siUpdateBtn();
  updateSICounters();
}

function siClear() {
  siBags = [];
  renderSIList();
  siUpdateSub();
  siUpdateBtn();
  updateSICounters();
}

function siUpdateBtn() {
  document.getElementById('si-sub').disabled = !(siBox && siBags.length);
}

function autoSaveSI() {
  if (!siBox || !siBags.length) return 0;
  if (!DB.inv[siBox]) DB.inv[siBox] = [];

  const news = siBags.filter(b => {
    const found = findBagInDB(b.c);
    return !found.exists;
  });

  if (news.length) {
    DB.inv[siBox].push(...news.map(b => b.c));
    const ts = now();
    news.forEach(b => DB.tx.unshift({ type: 'in', code: b.c, box: siBox, lokasi: null, time: ts }));
    DB.save();
    updateTopBadge();
  }

  const count = news.length;
  siBags = [];
  renderSIList();
  siUpdateSub();
  siUpdateBtn();
  updateSICounters();
  return count;
}

function submitSI() {
  if (!siBox || !siBags.length) return;
  if (!DB.inv[siBox]) DB.inv[siBox] = [];

  const duplicates = [];
  const news = siBags.filter(b => {
    const found = findBagInDB(b.c);
    if (found.exists) { duplicates.push({ c: b.c, box: found.box }); return false; }
    return true;
  });

  if (duplicates.length && !news.length) {
    flash('si-msg', 'err', 'Semua bag sudah ada di gudang, tidak ada yang disimpan');
    return;
  }

  DB.inv[siBox].push(...news.map(b => b.c));
  const ts = now();
  news.forEach(b => DB.tx.unshift({ type: 'in', code: b.c, box: siBox, lokasi: null, time: ts }));
  DB.save();
  updateTopBadge();

  let msg = news.length + ' bag disimpan ke box <strong>' + siBox + '</strong>';
  if (duplicates.length) msg += ' · ' + duplicates.length + ' dilewati (duplikat)';
  flash('si-msg', 'ok', msg);

  siBags = [];
  renderSIList();
  siUpdateSub();
  siUpdateBtn();
  updateSICounters();
}

/* ══════════════════════════════════════════
   LOKASI (halaman Scan Box → sekarang Lokasi)
══════════════════════════════════════════ */
function renderLokasiGrid() {
  const el = document.getElementById('lokasi-grid');
  if (!el) return;

  el.innerHTML = LOKASI_LIST.map(lok => `
    <button
      class="lokasi-btn${sbLokasi === lok.code ? ' selected' : ''}"
      onclick="selectLokasi('${lok.code}')"
      title="${lok.code}"
    >
      <i class="ti ${lok.icon}"></i>
      ${lok.label}
      ${lok.isTemp ? '<span class="lokasi-temp-badge"><i class="ti ti-star" style="font-size:9px"></i>Default</span>' : ''}
    </button>
  `).join('');
}

function selectLokasi(code) {
  sbLokasi = code;
  renderLokasiGrid();
  const st = document.getElementById('sb-state');
  st.className = 'state-pill set';
  st.querySelector('.sp-icon').className = 'sp-icon set';
  st.querySelector('.sp-icon').innerHTML = '<i class="ti ti-map-pin"></i>';
  const v = document.getElementById('sb-lok-val');
  v.className = 'sp-value set';
  v.textContent = code;
  flash('sb-msg', 'info', 'Lokasi dipilih: <strong>' + code + '</strong>');
}

function procSB() {
  const raw = document.getElementById('sb-input').value.trim();
  if (!raw) return;

  const t = getType(raw);
  const c = norm(raw);
  document.getElementById('sb-input').value = '';

  if (t === 'box') {
    if (sbBoxes.includes(c)) { flash('sb-msg', 'warn', 'Box sudah ada dalam daftar'); return; }
    sbBoxes.push(c);
    renderSBList();
    updateSBCounters();
    flash('sb-msg', 'ok', 'Box ditambahkan: <strong>' + c + '</strong>');
    document.getElementById('sb-sub').disabled = false;
    return;
  }

  if (t === 'bag') { flash('sb-msg', 'warn', 'Kode bag diproses di halaman Scan In'); return; }

  flash('sb-msg', 'err', 'Format tidak dikenal: ' + raw, 5000);
}

function renderSBList() {
  const el = document.getElementById('sb-list');
  document.getElementById('sb-cnt').textContent = sbBoxes.length;

  if (!sbBoxes.length) {
    el.innerHTML = '<div class="empty"><i class="ti ti-box"></i>Belum ada box</div>';
    return;
  }

  el.innerHTML = '<div class="items">' + sbBoxes.map((c, i) => `
    <div class="item">
      <i class="ti ti-box"></i>
      <span class="item-code">${c}</span>
      <button class="item-del" onclick="sbRem(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('') + '</div>';
}

function sbRem(i) {
  sbBoxes.splice(i, 1);
  renderSBList();
  updateSBCounters();
  if (!sbBoxes.length) document.getElementById('sb-sub').disabled = true;
}

function sbClear() {
  sbBoxes = [];
  renderSBList();
  updateSBCounters();
  document.getElementById('sb-sub').disabled = true;
}

function submitSB() {
  if (!sbBoxes.length) return;
  const ts = now();
  sbBoxes.forEach(b => {
    DB.loc[b] = sbLokasi;
    DB.tx.unshift({ type: 'in', code: b, box: null, lokasi: sbLokasi, time: ts, isBox: true });
  });
  DB.save();
  flash('sb-msg', 'ok', sbBoxes.length + ' box disimpan ke lokasi <strong>' + sbLokasi + '</strong>');
  sbBoxes = [];
  renderSBList();
  updateSBCounters();
  document.getElementById('sb-sub').disabled = true;
}

/* ══════════════════════════════════════════
   SCAN OUT
══════════════════════════════════════════ */
function procSO() {
  const raw = document.getElementById('so-input').value.trim();
  if (!raw) return;

  const t = getType(raw);
  const c = norm(raw);
  document.getElementById('so-input').value = '';

  if (t !== 'bag') {
    flash('so-msg', 'err', 'Scan Out hanya menerima kode bag (0211xxxxxx)');
    return;
  }

  if (soBags.find(b => b.c === c)) {
    flash('so-msg', 'warn', 'Bag <strong>' + c + '</strong> sudah ada dalam daftar sesi ini');
    return;
  }

  const found = findBagInDB(c);

  if (!found.exists) {
    flash('so-msg', 'err', 'Bag <strong>' + c + '</strong> tidak ditemukan dalam gudang');
    return;
  }

  soBags.push({ c, box: found.box });
  renderSOList();
  updateSOCounters();
  flash('so-msg', 'info', 'Bag <strong>' + c + '</strong> → box <strong>' + found.box + '</strong>');
  document.getElementById('so-sub').disabled = false;
}

function renderSOList() {
  const el = document.getElementById('so-list');
  document.getElementById('so-cnt').textContent = soBags.length;

  if (!soBags.length) {
    el.innerHTML = '<div class="empty"><i class="ti ti-package-export"></i>Belum ada bag</div>';
    return;
  }

  el.innerHTML = '<div class="items">' + soBags.map((b, i) => `
    <div class="item">
      <i class="ti ti-shopping-bag"></i>
      <div style="flex:1">
        <div class="item-code">${b.c}</div>
        <div class="item-box">Box: ${b.box}</div>
      </div>
      <button class="item-del" onclick="soRem(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('') + '</div>';
}

function soRem(i) {
  soBags.splice(i, 1);
  renderSOList();
  updateSOCounters();
  if (!soBags.length) document.getElementById('so-sub').disabled = true;
}

function soClear() {
  soBags = [];
  renderSOList();
  updateSOCounters();
  document.getElementById('so-sub').disabled = true;
}

function submitSO() {
  if (!soBags.length) return;
  const ts = now();
  soBags.forEach(b => {
    if (DB.inv[b.box]) DB.inv[b.box] = DB.inv[b.box].filter(c => c !== b.c);
    DB.tx.unshift({ type: 'out', code: b.c, box: b.box, lokasi: null, time: ts });
  });
  DB.out += soBags.length;
  DB.save();
  updateTopBadge();
  flash('so-msg', 'ok', soBags.length + ' bag berhasil dikeluarkan dari gudang');
  soBags = [];
  renderSOList();
  updateSOCounters();
  document.getElementById('so-sub').disabled = true;
}

/* ══════════════════════════════════════════
   UPLOAD MODAL
══════════════════════════════════════════ */
function openUploadModal(page) {
  uploadCtx = { page };

  let boxes = 0, bags = 0, lokasi = '-';

  if (page === 'scanin') {
    boxes = siBox ? 1 : 0;
    bags  = siBags.length;
    lokasi = '-';
  } else if (page === 'lokasi') {
    boxes = sbBoxes.length;
    bags  = 0;
    lokasi = sbLokasi;
  } else if (page === 'scanout') {
    boxes = 0;
    bags  = soBags.length;
    lokasi = '-';
  }

  uploadCtx.boxes  = boxes;
  uploadCtx.bags   = bags;
  uploadCtx.lokasi = lokasi;

  // Populate modal info
  document.getElementById('modal-page-label').textContent =
    page === 'scanin' ? 'Scan In' :
    page === 'lokasi' ? 'Lokasi' : 'Scan Out';

  document.getElementById('modal-boxes-val').textContent = boxes;
  document.getElementById('modal-bags-val').textContent  = bags;
  document.getElementById('modal-lokasi-val').textContent = lokasi;

  const hasData = (boxes + bags) > 0;
  document.getElementById('modal-confirm-btn').disabled = !hasData;

  // Reset progress
  const prog = document.getElementById('upload-progress');
  prog.classList.remove('show');
  document.getElementById('upload-status-text').textContent = 'Mengirim data...';

  document.getElementById('upload-modal').classList.add('open');
}

function closeUploadModal() {
  document.getElementById('upload-modal').classList.remove('open');
  uploadCtx = null;
}

function confirmUpload() {
  if (!uploadCtx) return;

  const prog = document.getElementById('upload-progress');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  prog.classList.add('show');
  confirmBtn.disabled = true;

  // Bangun payload sesuai halaman
  let payload = { page: uploadCtx.page, time: now() };

  if (uploadCtx.page === 'scanin') {
    payload.box  = siBox;
    payload.bags = siBags.map(b => b.c);
  } else if (uploadCtx.page === 'lokasi') {
    payload.boxes  = sbBoxes;
    payload.lokasi = sbLokasi;
  } else if (uploadCtx.page === 'scanout') {
    payload.bags = soBags.map(b => ({ code: b.c, box: b.box }));
  }

  document.getElementById('upload-status-text').textContent = 'Mengirim ke server...';

  fetch('config/upload.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(data => {
    document.getElementById('upload-status-text').textContent =
      data.success ? 'Upload berhasil!' : 'Gagal: ' + (data.message || 'Error server');
    setTimeout(() => {
      closeUploadModal();
      const msgId = uploadCtx?.page === 'scanin' ? 'si-msg' :
                    uploadCtx?.page === 'lokasi' ? 'sb-msg' : 'so-msg';
      if (data.success) {
        flash(msgId || 'si-msg', 'ok', 'Data berhasil diupload ke server');
      } else {
        flash(msgId || 'si-msg', 'err', 'Upload gagal: ' + (data.message || 'Error server'));
      }
    }, 1200);
  })
  .catch(() => {
    document.getElementById('upload-status-text').textContent = 'Koneksi gagal!';
    setTimeout(() => {
      closeUploadModal();
      const msgId = uploadCtx?.page === 'scanin' ? 'si-msg' :
                    uploadCtx?.page === 'lokasi' ? 'sb-msg' : 'so-msg';
      flash(msgId || 'si-msg', 'err', 'Upload gagal — tidak dapat terhubung ke server');
    }, 1200);
  });
}

/* ══════════════════════════════════════════
   CAMERA
══════════════════════════════════════════ */
async function toggleCam(camId, inputId, cb) {
  const cam = document.getElementById(camId);
  if (!cam) return;

  if (cam.classList.contains('open')) { stopCam(camId); return; }

  const vidId = camId.replace('-cam', '-video');
  const vid   = document.getElementById(vidId);
  if (!vid) return;

  cam.classList.add('open');
  document.getElementById(camId.replace('-cam', '-cam-btn'))?.classList.add('active-cam');

  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } }
    });
    streams[camId] = s;
    vid.srcObject = s;
    await vid.play();

    const hints = new Map();
    hints.set(2, [1,2,3,4,5,6,7,8,11,12,13,14,15,16,17,18,20,21]);

    const reader = new ZXing.BrowserMultiFormatReader(hints);
    streams[camId + '_r'] = reader;

    const stEl = document.getElementById(camId + '-st') || cam.querySelector('.cam-status');

    reader.decodeFromVideoElement(vid, (res, err) => {
      if (res) {
        const txt = res.getText();
        document.getElementById(inputId).value = txt;
        if (stEl) stEl.textContent = 'Terdeteksi: ' + txt;
        stopCam(camId);
        setTimeout(cb, 80);
      }
    });

  } catch (e) {
    cam.classList.remove('open');
    document.getElementById(camId.replace('-cam', '-cam-btn'))?.classList.remove('active-cam');
    const msgId = camId.replace('-cam', '-msg');
    flash(msgId, 'err', 'Kamera tidak tersedia: ' + (e.message || 'izin ditolak'));
  }
}

function stopCam(id) {
  document.getElementById(id)?.classList.remove('open');
  document.getElementById(id.replace('-cam', '-cam-btn'))?.classList.remove('active-cam');
  try { streams[id]?.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { streams[id + '_r']?.reset(); } catch (e) {}
  delete streams[id];
  delete streams[id + '_r'];
}

function stopAllCams() {
  ['si-cam', 'sb-cam', 'so-cam'].forEach(stopCam);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  updateTopBadge();
  renderLokasiGrid();
  // Set lokasi state ke Temporary by default
  selectLokasi('Temporary');
  // Init counters
  updateSICounters();
  updateSOCounters();
  updateSBCounters();
});
