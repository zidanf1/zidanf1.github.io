/* ============================================================
   9. LOCATION
   
   3 sub-halaman:
   ① Denah Rak  — grid semua rak + status kapasitas
   ② Isi Rak    — daftar palet dalam rak yang dipilih
   ③ Isi Palet  — scan box untuk membuat palet baru

   Kapasitas per rak: 16 palet

   Data ke server:
   ● Scan box ke palet : POST /config/scan-box.php → { barcode_box, kode_rak, username }
   ● Simpan palet      : POST /config/palet.php    → { kode_rak, username, boxes: [...] }

   Response dari server:
   ● Scan box : { id_box, bags: [{ barcode, lotcode, qty, size, nilai }] }
   ● Simpan   : { plt_name }
   ============================================================ */

const LOC_CAP = 16;  // kapasitas maksimal palet per rak
let locSelRak = null; // kode rak yang sedang dipilih (contoh: 'A3')
let locBoxes  = [];   // array box yang sudah discan untuk palet baru

/**
 * Inisialisasi Location:
 * - Tampilkan sub-halaman 1 (Denah Rak)
 * - Load data rak dari server (via locInitData)
 */
function locInit() {
  locInitData();
}

/**
 * Render grid denah rak dari data server
 *
 * Warna sel rak berdasarkan jumlah palet:
 * ● st-empty: 0 palet (abu-abu)
 * ● st-some:  1–15 palet (kuning)
 * ● st-full:  16 palet / penuh (hijau)
 *
 * @param {Array} rakList - array dari server: [{ id_rak, jumlah_palet, kapasitas }]
 */
function locRenderGrid(rakList) {

  // Buat peta: id_rak → jumlah_palet untuk lookup cepat
  const map = {};
  rakList.forEach(r => { map[r.id_rak] = r.jumlah_palet; });

  // Fungsi helper: ambil jumlah palet rak
  const count = (id) => map[id] || 0;

  // Fungsi helper: tentukan CSS class warna rak
  const getCls = (id) => {
    const n = count(id);
    if (n === 0)      return 'st-empty'; // kosong
    if (n >= LOC_CAP) return 'st-full';  // penuh
    return 'st-some';                    // sebagian
  };

  // ── Render sel Temporary ──────────────────────────────────
  const T = document.getElementById('cell-T');
  T.className = 'tmp-row ' + getCls('Temporary');
  T.innerHTML =
    '<span>Temporary</span>' +
    '<span style="font-size:11px;opacity:.85">' + count('Temporary') + '/' + LOC_CAP + '</span>';

  // ── Render grid Zona A (A1–A10) dan Zona B (B1–B10) ──────
  ['a', 'b'].forEach(zone => {
    const grid = document.getElementById('grid-' + zone);
    grid.innerHTML = ''; // kosongkan grid

    for (let i = 1; i <= 10; i++) {
      const id  = (zone === 'a' ? 'A' : 'B') + i; // contoh: 'A3', 'B7'
      const cnt = count(id);

      const cell       = document.createElement('div');
      cell.className   = 'rak-cell ' + getCls(id);
      cell.innerHTML   = `<div><div>${id}</div><div class="sub">${cnt}/${LOC_CAP}</div></div>`;
      cell.onclick     = () => locPick(id); // klik → buka isi rak

      grid.appendChild(cell);
    }
  });

  // ── Update statistik di bawah grid ───────────────────────
  let some = 0, full = 0, empty = 0;
  rakList.forEach(r => {
    const n = r.jumlah_palet;
    if (n === 0)           empty++;
    else if (n >= LOC_CAP) full++;
    else                   some++;
  });
  setTxt('stat-some',  some);
  setTxt('stat-full',  full);
  setTxt('stat-empty', empty);
}

/**
 * Klik rak di denah → pindah ke sub-halaman Isi Rak
 * @param {string} id - kode rak yang dipilih, contoh: 'A3'
 */
function locPick(id) {
  locSelRak = id;    // simpan rak yang dipilih
  locSetPg(2);       // tampilkan sub-halaman isi rak
  locSetBc(2);       // update breadcrumb
  locLoadRak(id);    // load data palet dari server
}

/**
 * Load daftar palet dalam rak dari server
 * @param {string} id - kode rak
 */
async function locLoadRak(id) {
  setTxt('p2-lok', id);          // tampilkan nama rak di header
  setTxt('p2-kap', 'Memuat...'); // tampilkan status loading
  show('p2-loading');

  // Kosongkan konten sebelumnya
  document.getElementById('p2-body').innerHTML = '';
  document.getElementById('btn-add-plt').style.display = 'none';

  try {
    // Ambil daftar palet dalam rak dari server
    const res = await apiRequest('GET', '/location_rak.php?id=' + id + '&username=' + SESSION.username);
    locRenderP2(res.data); // render daftar palet
  } catch (err) {
    // Tampilkan pesan error jika gagal
    document.getElementById('p2-body').innerHTML =
      `<div class="card"><p style="color:var(--red-t);font-size:13px;text-align:center;padding:16px">${err.message}</p></div>`;
  } finally {
    hide('p2-loading');
  }
}

/**
 * Grouping data untuk tabel isi rak:
 * Group by: Lotcode + Size → jumlahkan Nilai (pairs)
 * QTY diambil dari bag pertama (1 Lotcode = 1 QTY yang sama)
 *
 * @param {Array} boxes - array box dari server
 * @returns {Array} baris yang sudah digabungkan
 */
function locGroup(boxes) {
  const map = {};

  boxes.forEach(bx => {
    bx.bags.forEach(b => {
      // Key grouping: Lotcode + Size
      // (QTY tidak masuk key karena 1 Lotcode = 1 QTY)
      const key = b.lotcode + '||' + b.size;

      if (!map[key]) {
        // Inisialisasi group baru
        map[key] = {
          lotcode: b.lotcode,
          qty:     b.qty,   // QTY PO — sama untuk semua bag dalam 1 Lotcode
          size:    b.size,
          nilai:   0,       // akan diakumulasi
        };
      }

      // Jumlahkan pairs dari semua bag dalam group ini
      map[key].nilai += b.nilai;
    });
  });

  // Kembalikan sebagai array, urutkan: Lotcode asc → Size asc (numerik)
  return Object.values(map).sort((a, b) =>
    a.lotcode.localeCompare(b.lotcode) || Number(a.size) - Number(b.size)
  );
}

/**
 * Render sub-halaman 2: daftar palet dalam rak yang dipilih
 * @param {Array} pallets - array palet dari server
 */
function locRenderP2(pallets) {
  const cnt  = pallets.length;    // jumlah palet saat ini
  const full = cnt >= LOC_CAP;    // apakah rak sudah penuh?

  // Update info kapasitas
  setTxt('p2-kap', cnt + '/' + LOC_CAP + ' palet terisi');

  // Tampilkan/sembunyikan tombol tambah palet
  document.getElementById('btn-add-plt').style.display = full ? 'none' : 'flex';

  const body = document.getElementById('p2-body');

  // ── Rak kosong: tampilkan empty state ────────────────────
  if (!pallets.length) {
    body.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <i class="ti ti-packages"></i>
          <p>Rak <strong>${locSelRak}</strong> kosong</p>
          <small>Belum ada palet di rak ini</small>
          <button class="btn-info" onclick="locOpenP3()" style="margin:0 auto">
            <i class="ti ti-plus"></i> Tambahkan Palet
          </button>
        </div>
      </div>`;
    return;
  }

  // ── Render setiap palet sebagai card ─────────────────────
  let html = '';
  pallets.forEach((plt, pi) => {
    const grouped    = locGroup(plt.boxes); // group data untuk tabel
    const totalPairs = grouped.reduce((a, x) => a + x.nilai, 0); // total pairs palet ini

    html += `
      <div class="plt-card">
        <div class="plt-head">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="plt-badge">P${pi + 1}</div>
            <div>
              <div class="plt-name">${plt.plt_name}</div>
              <div class="plt-meta">${plt.boxes.length} box</div>
            </div>
          </div>
          <div class="plt-total">
            <div class="plt-total-lbl">Total</div>
            <div class="plt-total-val">${totalPairs} pairs</div>
          </div>
        </div>
        <div class="tbl-scroll"><table>
          <thead><tr>
            <th>Lotcode</th>
            <th class="tr">QTY</th>
            <th class="tc">Size</th>
            <th class="tr">Nilai</th>
          </tr></thead>
          <tbody>
            ${grouped.map(r => `
              <tr>
                <td>${r.lotcode}</td>
                <td class="tr">${r.qty}</td>
                <td class="tc">${r.size}</td>
                <td class="tr">${r.nilai} pairs</td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  });

  // Tombol tambah palet di bawah daftar (jika rak belum penuh)
  if (!full) {
    html += `
      <button class="btn-dashed" onclick="locOpenP3()">
        <i class="ti ti-plus"></i> Tambahkan Palet (${cnt}/${LOC_CAP} terisi)
      </button>`;
  }

  body.innerHTML = html;
}

/** Buka sub-halaman 3: form scan box untuk membuat palet baru */
function locOpenP3() {
  locBoxes = []; // reset daftar box yang akan discan

  // Buat nama palet sementara (server yang akan assign nama final)
  const now = new Date();
  const d   = now.getFullYear().toString()
            + String(now.getMonth() + 1).padStart(2, '0')
            + String(now.getDate()).padStart(2, '0');
  setTxt('p3-sub', locSelRak + ' · PLT-' + d + '-? (ditetapkan server)');

  // Reset UI
  setTxt('p3-cnt', '0 box');
  document.getElementById('p3-bc').value = '';

  // Sembunyikan semua state sebelumnya
  ['p3-err', 'p3-ok', 'p3-loading', 'p3-save', 'p3-saving', 'p3-done']
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  locRenderP3(); // render tabel kosong
  locSetPg(3);   // tampilkan sub-halaman 3
  locSetBc(3);   // update breadcrumb

  // Fokus ke input scan
  setTimeout(() => document.getElementById('p3-bc').focus(), 100);
}

/**
 * Scan box ke palet yang sedang dibuat:
 * 1. Validasi barcode tidak kosong & tidak duplikat
 * 2. Kirim ke server → dapat data isi box (semua bag dalam box)
 * 3. Tambah ke array locBoxes
 */
async function locScanBox() {
  const barcode = val('p3-bc');
  const errEl   = document.getElementById('p3-err');

  // Reset notifikasi
  errEl.style.display = 'none';
  hideEl('p3-ok');

  // Validasi: barcode tidak kosong
  if (!barcode) {
    errEl.textContent   = 'Barcode box wajib diisi';
    errEl.style.display = 'block';
    return;
  }

  // Validasi: box belum discan sebelumnya dalam palet ini
  if (locBoxes.find(b => b.id_box === barcode)) {
    errEl.textContent   = 'Box ini sudah discan';
    errEl.style.display = 'block';
    return;
  }

  show('p3-loading'); // tampilkan loading

  try {
    // Kirim ke server → dapat data isi box (id_box + daftar bag)
    const res = await apiRequest('POST', '/config/scan-box.php', {
      barcode_box: barcode,
      kode_rak:    locSelRak,
      username:    SESSION.username,
    });

    const box        = res.data;
    const totalPairs = box.bags.reduce((a, b) => a + b.nilai, 0); // hitung total pairs

    // Tambahkan ke array palet yang sedang dibuat
    locBoxes.push({
      id_box:      box.id_box,
      bags:        box.bags,
      totalPairs,
    });

    locRenderP3(); // render ulang tabel

    // Notifikasi sukses
    flashOk('p3-ok', 'p3-ok-msg',
      box.id_box + ' · ' + box.bags.length + ' bag · ' + totalPairs + ' pairs'
    );

    // Reset input & fokus untuk scan berikutnya
    document.getElementById('p3-bc').value = '';
    document.getElementById('p3-bc').focus();

  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  } finally {
    hide('p3-loading');
  }
}

/**
 * Hapus box dari daftar palet yang sedang dibuat
 * @param {number} i - index box yang dihapus
 */
function locDelBox(i) {
  locBoxes.splice(i, 1); // hapus dari array
  locRenderP3();          // render ulang tabel
}

/** Render tabel DATA BOX di sub-halaman 3 */
function locRenderP3() {
  const tbody   = document.getElementById('p3-tbody');
  const tot     = document.getElementById('p3-total');
  const saveBtn = document.getElementById('p3-save');

  // Update counter
  setTxt('p3-cnt', locBoxes.length + ' box');

  // Jika tidak ada box
  if (!locBoxes.length) {
    tbody.innerHTML       = '<tr><td colspan="6" class="empty-cell">Belum ada box</td></tr>';
    tot.style.display     = 'none';
    saveBtn.style.display = 'none';
    return;
  }

  // Hitung total pairs dari semua box
  let totalPairs = 0;

  // Render setiap baris box
  tbody.innerHTML = locBoxes.map((b, i) => {
    totalPairs += b.totalPairs;

    // Preview: ambil lotcode unik dari box ini (bisa > 1)
    const lots  = [...new Set(b.bags.map(x => x.lotcode))].join(', ');
    // Preview: ambil 3 size pertama
    const sizes = [...new Set(b.bags.map(x => x.size))].slice(0, 3).join('/');

    return `<tr>
      <td class="mono">${b.id_box}</td>
      <td>${lots}</td>
      <td class="tc">${b.bags[0] ? b.bags[0].qty : '—'}</td>
      <td class="tc">${sizes}</td>
      <td class="tc">${b.totalPairs} pairs</td>
      <td><button class="del-btn" onclick="locDelBox(${i})">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button></td>
    </tr>`;
  }).join('');

  // Update total
  setTxt('p3-total-n',     locBoxes.length);
  setTxt('p3-total-pairs', totalPairs + ' pairs');
  tot.style.display      = 'flex';
  saveBtn.style.display  = 'flex'; // tampilkan tombol simpan
}

/**
 * Simpan palet ke server:
 * - Kirim semua box yang sudah discan
 * - Server akan buat nama palet otomatis (PLT-YYYYMMDD-N)
 */
async function locSavePalet() {
  if (!locBoxes.length) return; // tidak ada yang disimpan

  hide('p3-save');    // sembunyikan tombol simpan
  show('p3-saving');  // tampilkan loading simpan

  try {
    // Kirim data palet ke server
    const res = await apiRequest('POST', '/config/palet.php', {
      kode_rak: locSelRak,
      username: SESSION.username,
      boxes:    locBoxes.map(b => ({ id_box: b.id_box, bags: b.bags })), // kirim id & bag
    });

    // Hitung total pairs palet ini
    const totalPairs = locBoxes.reduce((a, b) => a + b.totalPairs, 0);

    // Tampilkan pesan sukses dengan nama palet dari server
    setTxt('p3-done-msg',
      res.data.plt_name + ' · ' +
      locBoxes.length + ' box · ' +
      totalPairs + ' pairs · Rak ' + locSelRak
    );

    hide('p3-saving');
    show('p3-done');   // tampilkan card sukses
    locBoxes = [];     // reset daftar box

  } catch (err) {
    hide('p3-saving');
    show('p3-save');   // kembalikan tombol simpan

    // Tampilkan error
    const errEl = document.getElementById('p3-err');
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  }
}

/** Tombol "+ Palet Lagi": reset halaman 3 tanpa kembali ke halaman 2 */
function locLagi() {
  hide('p3-done');
  locOpenP3();
}

// ── Navigasi sub-halaman Location ─────────────────────────────────────

/**
 * Update breadcrumb Location sesuai sub-halaman aktif
 * @param {number} n - sub-halaman: 1 | 2 | 3
 */
function locSetBc(n) {
  const bc1 = document.getElementById('bc1');
  const bc2 = document.getElementById('bc2');
  const bc3 = document.getElementById('bc3');
  const bs2 = document.getElementById('bc-s2');
  const bs3 = document.getElementById('bc-s3');

  // Reset class semua breadcrumb
  bc1.className = 'bc-link';
  bc2.className = 'bc-link';

  if (n === 1) {
    // Hanya "Denah Rak" aktif
    bc1.className     = 'bc-active';
    bs2.style.display = 'none';
    bc2.style.display = 'none';
    bs3.style.display = 'none';
    bc3.style.display = 'none';
  } else if (n === 2) {
    // "Denah Rak > [nama rak]" aktif
    bc2.textContent   = locSelRak; // tampilkan nama rak
    bc2.className     = 'bc-active';
    bs2.style.display = 'inline';
    bc2.style.display = 'inline';
    bs3.style.display = 'none';
    bc3.style.display = 'none';
  } else {
    // "Denah Rak > [nama rak] > Isi Palet" aktif
    bc2.textContent   = locSelRak;
    bs2.style.display = 'inline';
    bc2.style.display = 'inline';
    bs3.style.display = 'inline';
    bc3.style.display = 'inline';
  }
}

/**
 * Tampilkan sub-halaman Location ke-n
 * @param {number} n - 1 | 2 | 3
 */
function locSetPg(n) {
  // Sembunyikan semua sub-halaman
  document.querySelectorAll('.loc-pg').forEach(p => p.classList.remove('on'));
  // Tampilkan sub-halaman yang dituju
  document.getElementById('loc-pg' + n).classList.add('on');
  window.scrollTo(0, 0);
}

/**
 * Navigasi Location via klik breadcrumb
 * @param {number} n - sub-halaman tujuan
 */
function locGo(n) {
  locSetPg(n);
  locSetBc(n);
  if (n === 1) locInit();                      // reload denah
  else if (n === 2 && locSelRak) locLoadRak(locSelRak); // reload isi rak
}


/* ============================================================
   11. LOCATION PAGE — UI (render, sheet, filter, modal)
   Data master rak & logika UI untuk halaman Location versi baru.
   Semua fungsi menggunakan prefix "loc" agar konsisten.
   ============================================================ */

/* ── 11.1 DATA MASTER RAK ───────────────────────────────── */

const locRaks = [
  { id:'TEMP-01', zona:'Temporary', status:'sebagian', palets:[
    { id:'PLT-001', lotcode:'LC-2024-01', qtySpk:200, model:'Runner X Pro',
      boxes:[{boxId:'BOX-001',size:'38',total:30},{boxId:'BOX-001',size:'39',total:30},{boxId:'BOX-003',size:'40',total:30},{boxId:'BOX-004',size:'41',total:30}]},
    { id:'PLT-002', lotcode:'LC-2024-02', qtySpk:150, model:'Runner X Pro',
      boxes:[{boxId:'BOX-005',size:'39',total:38},{boxId:'BOX-006',size:'40',total:42}]},
  ]},
  { id:'A-01', zona:'Zona A', status:'penuh', palets:[
    { id:'PLT-A01', lotcode:'LC-2024-03', qtySpk:500, model:'Aero Lite',
      boxes:[{boxId:'BOX-A01',size:'38',total:40},{boxId:'BOX-A02',size:'39',total:50},{boxId:'BOX-A03',size:'40',total:60},{boxId:'BOX-A04',size:'41',total:50}]},
    { id:'PLT-A02', lotcode:'LC-2024-04', qtySpk:300, model:'Aero Lite',
      boxes:[{boxId:'BOX-A05',size:'39',total:75},{boxId:'BOX-A06',size:'40',total:75}]},
    { id:'PLT-A03', lotcode:'LC-2024-05', qtySpk:360, model:'Street Bold',
      boxes:[{boxId:'BOX-A07',size:'40',total:90},{boxId:'BOX-A08',size:'41',total:90},{boxId:'BOX-A09',size:'42',total:90},{boxId:'BOX-A10',size:'43',total:90}]},
    { id:'PLT-A04', lotcode:'LC-2024-06', qtySpk:320, model:'Street Bold',
      boxes:[{boxId:'BOX-A11',size:'39',total:80},{boxId:'BOX-A12',size:'40',total:80},{boxId:'BOX-A13',size:'41',total:80},{boxId:'BOX-A14',size:'42',total:80}]},
    { id:'PLT-A05', lotcode:'LC-2024-07', qtySpk:280, model:'Casual Step',
      boxes:[{boxId:'BOX-A15',size:'38',total:70},{boxId:'BOX-A16',size:'39',total:70},{boxId:'BOX-A17',size:'40',total:70},{boxId:'BOX-A18',size:'41',total:70}]},
  ]},
  { id:'A-02', zona:'Zona A', status:'kosong', palets:[]},
  { id:'A-03', zona:'Zona A', status:'sebagian', palets:[
    { id:'PLT-A06', lotcode:'LC-2024-08', qtySpk:380, model:'Casual Step',
      boxes:[{boxId:'BOX-A19',size:'38',total:95},{boxId:'BOX-A21',size:'39',total:95},{boxId:'BOX-A21',size:'40',total:95},{boxId:'BOX-A22',size:'41',total:95}]},
    { id:'PLT-A07', lotcode:'LC-2024-09', qtySpk:220, model:'Flex Run',
      boxes:[{boxId:'BOX-A23',size:'40',total:110},{boxId:'BOX-A24',size:'41',total:110}]},
    { id:'PLT-A08', lotcode:'LC-2024-10', qtySpk:260, model:'Flex Run',
      boxes:[{boxId:'BOX-A25',size:'39',total:65},{boxId:'BOX-A26',size:'40',total:65},{boxId:'BOX-A27',size:'41',total:65},{boxId:'BOX-A28',size:'42',total:65}]},
  ]},
  { id:'A-04', zona:'Zona A', status:'kosong', palets:[]},
  { id:'B-01', zona:'Zona B', status:'sebagian', palets:[
    { id:'PLT-B01', lotcode:'LC-2024-17', qtySpk:250, model:'Urban Walk',
      boxes:[{boxId:'BOX-B01',size:'39',total:63},{boxId:'BOX-B02',size:'40',total:62},{boxId:'BOX-B03',size:'41',total:62},{boxId:'BOX-B04',size:'42',total:63}]},
    { id:'PLT-B02', lotcode:'LC-2024-18', qtySpk:190, model:'Urban Walk',
      boxes:[{boxId:'BOX-B05',size:'38',total:48},{boxId:'BOX-B05',size:'39',total:47},{boxId:'BOX-B08',size:'40',total:47},{boxId:'BOX-B08',size:'41',total:48}]},
  ]},
  { id:'B-02', zona:'Zona B', status:'kosong', palets:[]},
  { id:'B-03', zona:'Zona B', status:'penuh', palets:[
    { id:'PLT-B03', lotcode:'LC-2024-19', qtySpk:400, model:'Trail Master',
      boxes:[{boxId:'BOX-B09',size:'40',total:100},{boxId:'BOX-B10',size:'41',total:100},{boxId:'BOX-B11',size:'42',total:100},{boxId:'BOX-B12',size:'43',total:100}]},
    { id:'PLT-B04', lotcode:'LC-2024-20', qtySpk:350, model:'Trail Master',
      boxes:[{boxId:'BOX-B13',size:'39',total:88},{boxId:'BOX-B14',size:'40',total:87},{boxId:'BOX-B15',size:'41',total:88},{boxId:'BOX-B16',size:'42',total:87}]},
  ]},
  { id:'B-04', zona:'Zona B', status:'sebagian', palets:[
    { id:'PLT-B08', lotcode:'LC-2024-24', qtySpk:230, model:'Slide Plus',
      boxes:[{boxId:'BOX-B17',size:'38',total:58},{boxId:'BOX-B18',size:'39',total:57},{boxId:'BOX-B19',size:'40',total:58},{boxId:'BOX-B20',size:'41',total:57}]},
  ]},
  { id:'B-05', zona:'Zona B', status:'kosong', palets:[]},
];

/* ── 11.2 STATE FILTER ───────────────────────────────────── */
let locActiveStatus = 'all'; // filter chip aktif
let locActiveSearch = '';    // teks pencarian aktif

/* ── 11.3 RENDER UTAMA ───────────────────────────────────── */
/**
 * Render daftar rak berdasarkan filter status & pencarian.
 * Dipanggil saat: init, klik chip, ketik di search.
 */
function locRender() {
  const q         = locActiveSearch;
  const zonaOrder = ['Temporary', 'Zona A', 'Zona B'];
  const container = document.getElementById('loc-zones');
  if (!container) return;
  container.innerHTML = '';

  zonaOrder.forEach(zona => {
    const filtered = locRaks.filter(r => {
      if (r.zona !== zona) return false;
      const matchStatus = locActiveStatus === 'all' || r.status === locActiveStatus;
      const matchQuery  = q === '' ||
        r.id.toLowerCase().includes(q) ||
        r.palets.some(p =>
          p.lotcode.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
        );
      return matchStatus && matchQuery;
    });

    const sec = document.createElement('div');
    sec.className = 'loc-zona-section';
    sec.innerHTML = `<div class="loc-zona-label">${zona} <span>${filtered.length} rak</span></div>`;

    if (filtered.length === 0) {
      sec.innerHTML += `<div class="loc-empty-state">Tidak ada rak yang cocok</div>`;
      container.appendChild(sec);
      return;
    }

    const list = document.createElement('div');
    list.className = 'loc-rak-list';

    filtered.forEach(r => {
      const block = document.createElement('div');
      block.className = 'loc-rak-block';
      block.innerHTML = `
        <div class="loc-rak-header-row">
          <div class="loc-rak-id">${r.id}</div>
          <span class="loc-rak-pill loc-pill-${r.status}">${r.status}</span>
          <div class="loc-rak-palet-count">${r.palets.length} palet</div>
        </div>`;

      if (r.palets.length === 0) {
        block.innerHTML += `<div class="loc-lc-empty">Belum ada palet</div>`;
      } else {
        const palets = q === '' ? r.palets : r.palets.filter(p =>
          p.lotcode.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
        palets.forEach(p => {
          const row = document.createElement('div');
          row.className = 'loc-lc-row';
          row.innerHTML = `
            <div class="loc-lc-left">
              <span class="loc-lc-code">${p.lotcode}</span>
              <span class="loc-lc-sep">·</span>
              <span class="loc-lc-model">${p.model}</span>
            </div>
            <div class="loc-lc-arrow">›</div>`;
          row.onclick = () => locOpenSheet(p, r.id);
          block.appendChild(row);
        });
      }

      list.appendChild(block);
    });

    sec.appendChild(list);
    container.appendChild(sec);
  });
}

/* ── 11.4 BOTTOM SHEET — DETAIL PALET ───────────────────── */
/**
 * Buka bottom sheet detail palet.
 * @param {object} p     - objek palet
 * @param {string} rakId - ID rak tempat palet berada
 */
function locOpenSheet(p, rakId) {
  document.getElementById('locSheetLotcode').textContent = p.lotcode;
  document.getElementById('locSheetMeta').textContent    = 'Rak ' + rakId + ' · ' + p.model;

  const totalBox = new Set(p.boxes.map(b => b.boxId)).size;
  const totalQty = p.boxes.reduce((s, b) => {
    if (Array.isArray(b.sizes)) {
      return s + b.sizes.reduce((a, sz) => a + (sz.qty || 0), 0);
    }
    return s + (b.total || 0);
  }, 0);

  // Group boxes by boxId
  const boxMap = {};
  p.boxes.forEach(b => {
    if (!boxMap[b.boxId]) boxMap[b.boxId] = { boxId: b.boxId, sizes: [], rowTotal: 0 };
    if (Array.isArray(b.sizes)) {
      b.sizes.forEach(s => {
        boxMap[b.boxId].sizes.push({ size: s.size, total: s.qty });
        boxMap[b.boxId].rowTotal += (s.qty || 0);
      });
    } else {
      boxMap[b.boxId].sizes.push({ size: b.size, total: b.total });
      boxMap[b.boxId].rowTotal += (b.total || 0);
    }
  });

  const tableRows = Object.values(boxMap).map(bx => {
    const chips = bx.sizes
      .sort((a, z) => Number(a.size) - Number(z.size))
      .map(s => `<span class="loc-size-badge">
        <span class="sz">${s.size}</span>
        <span class="dot-mid">·</span>
        <span class="qty">${s.total}</span>
      </span>`).join('');
    const badge = `<div class="loc-size-badges">${chips}</div>`;
    return `<tr>
      <td class="mono box-id-cell">${bx.boxId.toLocaleUpperCase()}</td>
      <td class="size-cell">${badge}</td>
      <td class="right">${bx.rowTotal}</td>
    </tr>`;
  }).join('');

  document.getElementById('locSheetBody').innerHTML = `
    <div class="loc-info-row">
      <div class="loc-info-label"><i class="ti ti-tag"></i>Lotcode</div>
      <div class="loc-info-value">${p.lotcode}</div>
    </div>
    <div class="loc-info-row">
      <div class="loc-info-label"><i class="ti ti-file-text"></i>SPK</div>
      <div class="loc-info-value">${p.qtySpk.toLocaleString('id-ID')}</div>
    </div>
    <div class="loc-info-row">
      <div class="loc-info-label"><i class="ti ti-box"></i>Rak</div>
      <div class="loc-info-value">${rakId}</div>
    </div>
    <div class="loc-info-row">
      <div class="loc-info-label"><i class="ti ti-stack-2"></i>Total Box</div>
      <div class="loc-info-value">${totalBox} box</div>
    </div>
    <div class="loc-section-title">Detail Box</div>
    <div class="loc-box-wrap">
      <table class="loc-box-table">
        <thead><tr>
          <th class="col-boxid">Box ID</th>
          <th>Size · Qty</th>
          <th class="right col-total">Total</th>
        </tr></thead>
        <tbody>
          ${tableRows}
          <tr class="total-row">
            <td class="total-row-label">Total</td>
            <td class="total-val" colspan="2">${totalQty.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  document.getElementById('loc-overlay').classList.add('open');
  document.getElementById('loc-sheet').classList.add('open');
}

/* ── 11.5 TUTUP SHEET ────────────────────────────────────── */
function locCloseSheet() {
  document.getElementById('loc-overlay').classList.remove('open');
  document.getElementById('loc-sheet').classList.remove('open');
}

/* ── 11.6 FILTER CHIP STATUS ─────────────────────────────── */
/**
 * Set filter status aktif dan re-render.
 * @param {string} s - 'all' | 'kosong' | 'sebagian' | 'penuh'
 */
function locSetStatus(s) {
  locActiveStatus = s;
  ['all', 'kosong', 'sebagian', 'penuh'].forEach(x =>
    document.getElementById('loc-chip-' + x)
      .classList.toggle('active', x === s)
  );
  locRender();
}

/* ── 11.7 FILTER PENCARIAN ───────────────────────────────── */
function locApplyFilter() {
  locActiveSearch = document.getElementById('locSearchInput').value.trim().toLowerCase();
  locRender();
}

/* ── 11.8 MODAL TAMBAH LOKASI ────────────────────────────── */
let locModalBoxes   = []; // box yang sudah discan di modal
let locModalScanning = false; // mencegah double-scan

function locModalOpen() {
  locModalBoxes = [];
  document.getElementById('loc-modal-rak').value = '';
  document.getElementById('loc-modal-bc').value  = '';
  document.getElementById('loc-modal-bc-err').style.display  = 'none';
  document.getElementById('loc-modal-rak-err').style.display = 'none';
  document.getElementById('loc-modal-ok').style.display      = 'none';
  locModalRenderTable();
  document.getElementById('loc-modal-overlay').style.display = 'block';
  document.getElementById('loc-modal').style.display         = 'flex';
  setTimeout(() => document.getElementById('loc-modal-bc').focus(), 100);
}

function locModalClose() {
  document.getElementById('loc-modal-overlay').style.display = 'none';
  document.getElementById('loc-modal').style.display         = 'none';
}

function locModalRakChange() {
  document.getElementById('loc-modal-rak-err').style.display = 'none';
  locModalCheckSave();
}

function locModalCheckSave() {
  const btn     = document.getElementById('loc-modal-save');
  const hasRak  = !!document.getElementById('loc-modal-rak').value;
  const hasData = locModalBoxes.length > 0;
  if (hasRak && hasData) {
    btn.style.opacity       = '1';
    btn.style.pointerEvents = 'auto';
  } else {
    btn.style.opacity       = '.45';
    btn.style.pointerEvents = 'none';
  }
}

async function locModalScan() {
  if (locModalScanning) return;

  const rak     = document.getElementById('loc-modal-rak').value;
  const bcInput = document.getElementById('loc-modal-bc');
  const barcode = bcInput.value.trim();
  const errEl   = document.getElementById('loc-modal-bc-err');
  const okEl    = document.getElementById('loc-modal-ok');
  const okMsg   = document.getElementById('loc-modal-ok-msg');
  const scanBtn = document.querySelector('#loc-modal button[onclick="locModalScan()"]');

  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!rak) {
    document.getElementById('loc-modal-rak-err').textContent   = 'Pilih lokasi terlebih dahulu';
    document.getElementById('loc-modal-rak-err').style.display = 'block';
    document.getElementById('loc-modal-rak').focus();
    return;
  }
  if (!barcode) {
    errEl.textContent   = 'Barcode tidak boleh kosong';
    errEl.style.display = 'block';
    return;
  }
  if (locModalBoxes.find(b => b.id_box === barcode)) {
    errEl.textContent   = 'Box ini sudah discan';
    errEl.style.display = 'block';
    return;
  }

  locModalScanning = true;
  bcInput.disabled = true;
  if (scanBtn) {
    scanBtn.disabled  = true;
    scanBtn.innerHTML = '<i class="ti ti-loader spin"></i> Scanning…';
  }

  try {
    const res = await apiRequest('POST', '/config/scan-box.php', {
      barcode_box: barcode,
      kode_rak:    rak,
      username:    SESSION.username,
    });

    const box        = res.data;
    const bags       = box.bags.map(b => ({ size: b.size, total: b.nilai }));
    const totalPairs = bags.reduce((a, b) => a + b.total, 0);
    const lotcode    = box.bags[0]?.lotcode || '—';
    const sizes      = [...new Set(bags.map(b => b.size))].sort((a,z) => Number(a)-Number(z));

    locModalBoxes.push({ id_box: box.id_box, lotcode, bags, totalPairs });
    locModalRenderTable();

    okMsg.textContent  = box.id_box + ' · ' + lotcode + ' · ' + sizes.join('/') + ' · ' + totalPairs + ' pairs';
    okEl.style.display = 'flex';

    bcInput.value = '';
    locModalCheckSave();

  } catch (err) {
    errEl.textContent   = err.message || 'Gagal scan box';
    errEl.style.display = 'block';
  } finally {
    locModalScanning = false;
    bcInput.disabled = false;
    if (scanBtn) {
      scanBtn.disabled  = false;
      scanBtn.innerHTML = '<i class="ti ti-scan"></i> Scan';
    }
    bcInput.focus();
  }
}

function locModalDelBox(i) {
  locModalBoxes.splice(i, 1);
  locModalRenderTable();
  locModalCheckSave();
}

function locModalRenderTable() {
  const tbody = document.getElementById('loc-modal-tbody');
  const cnt   = document.getElementById('loc-modal-cnt');
  cnt.textContent = locModalBoxes.length + ' box';

  if (!locModalBoxes.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--t4);font-size:12px">Belum ada box</td></tr>';
    return;
  }

  let totalAll = 0;
  tbody.innerHTML = locModalBoxes.map((b, i) => {
    totalAll += b.totalPairs;
    const sizeChips = b.bags.map(s =>
      `<span style="display:inline-flex;align-items:center;gap:2px;border:1px solid var(--border);border-radius:99px;padding:1px 6px;font-size:10px;font-family:'IBM Plex Mono',monospace;background:#f0f4ff;white-space:nowrap">
        <span style="font-weight:700;color:var(--blue)">${s.size}</span>
        <span style="color:var(--t4);margin:0 1px">·</span>
        <span style="color:var(--t2)">${s.total}</span>
      </span>`
    ).join('');
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.id_box}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--t2)">${b.lotcode}</td>
      <td style="padding:8px 6px;text-align:center"><div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center">${sizeChips}</div></td>
      <td style="padding:8px 10px;text-align:right;font-size:12px;font-weight:600;color:var(--t1)">${b.totalPairs}</td>
      <td style="padding:8px 6px;text-align:center">
        <button onclick="locModalDelBox(${i})" style="border:none;background:none;cursor:pointer;color:var(--t4);padding:2px 4px;border-radius:4px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--t4)'">
          <i class="ti ti-trash" style="font-size:13px"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.innerHTML += `<tr style="background:#f7f8fa">
    <td colspan="3" style="padding:7px 10px;font-size:11px;color:var(--t3);font-weight:600">Total keseluruhan</td>
    <td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:700;color:var(--blue)">${totalAll}</td>
    <td></td>
  </tr>`;
}

async function locModalSave() {
  const rak     = document.getElementById('loc-modal-rak').value;
  const saveBtn = document.getElementById('loc-modal-save');
  if (!rak || !locModalBoxes.length) return;

  saveBtn.disabled  = true;
  saveBtn.innerHTML = '<i class="ti ti-loader spin"></i> Menyimpan…';

  try {
    await apiRequest('POST', '/config/palet.php', {
      kode_rak: rak,
      username: SESSION.username,
      boxes:    locModalBoxes.map(b => ({
        id_box: b.id_box,
        bags:   b.bags,
      })),
    });

    locModalClose();
    await locInitData();

  } catch (err) {
    const errEl = document.getElementById('loc-modal-bc-err');
    errEl.textContent   = 'Gagal simpan: ' + (err.message || 'Server error');
    errEl.style.display = 'block';

    saveBtn.disabled  = false;
    saveBtn.innerHTML = '<i class="ti ti-device-floppy"></i> Simpan';
  }
}

/* ── 11.9 LOAD DATA RAK DARI SERVER ─────────────────────── */
/**
 * Fetch daftar rak + palet dari server lalu render.
 * Dipakai oleh locInit() dan setelah simpan palet baru.
 */
async function locInitData() {
  const container = document.getElementById('loc-zones');
  if (!container) return;

  container.innerHTML = `
    <div style="padding:32px;text-align:center;color:var(--t4);font-size:13px">
      <i class="ti ti-loader spin" style="font-size:20px;display:block;margin-bottom:8px"></i>
      Memuat data rak…
    </div>`;

  try {
    const res = await apiRequest('GET', '/config/mapping-1.php?username=' + SESSION.username);
    locRaks.length = 0;
    (res.data || []).forEach(r => locRaks.push(r));
  } catch (err) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center">
        <div style="color:var(--red);font-size:13px;margin-bottom:8px">
          <i class="ti ti-wifi-off"></i> Gagal memuat: ${err.message}
        </div>
        <button onclick="locInitData()"
          style="font-size:12px;padding:6px 14px;border:1px solid var(--border);border-radius:var(--rs);background:var(--card);cursor:pointer;color:var(--t2)">
          <i class="ti ti-refresh"></i> Coba lagi
        </button>
      </div>`;
    return;
  }

  locRender();
}

