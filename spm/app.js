/* ============================
   SMS — app.js  (DEMO MODE)
   async / await throughout
   ============================ */

const USE_MOCK = true;                      // false = hit real API
const API_BASE = 'https://your-api.com/api';

// ─── SESSION ──────────────────────────────────────────
let SESSION = { token: null, username: null, role: null };

// ─── CONSTANTS ────────────────────────────────────────

// Shoe sizes 1 – 18 step 0.5
const SHOE_SIZES = [];
for (let s = 1; s <= 18; s += 0.5) {
  SHOE_SIZES.push(s % 1 === 0 ? String(s) : String(s));
}

// Line 1 – 25
const LINES = Array.from({ length: 25 }, (_, i) => 'Line ' + (i + 1));

const LOTS = ['LOT-A21', 'LOT-B14', 'LOT-C09', 'LOT-D33', 'LOT-E07', 'LOT-F12', 'LOT-G08'];

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function ri(arr)   { return arr[rnd(0, arr.length - 1)]; }

// ─── MOCK DATABASE ────────────────────────────────────

const MOCK_USERS = [
  { username: 'admin',    password: '1234', role: 'Admin'    },
  { username: 'operator', password: '1234', role: 'Operator' },
];

// Bag registry keyed by barcode
const MOCK_BAGS = {};

// Rak + palet data
const MOCK_RAK = (function () {
  const loks = [
    'Temporary',
    'A1','A2','A3','A4','A5','A6','A7','A8','A9','A10',
    'B1','B2','B3','B4','B5','B6','B7','B8','B9','B10',
  ];
  const db = {};
  loks.forEach(function (l) {
    const n = l === 'Temporary' ? rnd(0, 4) : rnd(0, 13);
    const pallets = [];
    for (let i = 0; i < n; i++) {
      const d   = '2026051' + rnd(0, 7);
      const lot = ri(LOTS);
      const boxes = [];
      for (let j = 0; j < rnd(1, 4); j++) {
        const bags = [];
        for (let k = 0; k < rnd(2, 6); k++) {
          bags.push({
            barcode: '0211' + String(rnd(100000000, 999999999)),
            lotcode: lot,
            qty:     rnd(200, 2000),
            size:    ri(SHOE_SIZES),
            nilai:   rnd(1, 12),
          });
        }
        boxes.push({ id_box: 'BOX-' + rnd(1000, 9999), bags });
      }
      pallets.push({ plt_name: 'PLT-' + d + '-' + (i + 1), boxes });
    }
    db[l] = pallets;
  });
  return db;
}());

// Report data (per-lotcode summary for today)
const MOCK_REPORT = LOTS.map(function (lot) {
  return {
    lotcode: lot,
    qty:     rnd(500, 3000),
    input:   rnd(20, 200),
    output:  rnd(0, 80),
  };
});

// ─── MOCK API ─────────────────────────────────────────

function delay(ms) {
  return new Promise(function (r) { setTimeout(r, ms || rnd(400, 800)); });
}

async function mockRequest(method, endpoint, body) {
  await delay();

  // Auth
  if (endpoint === '/auth/login') {
    const u = MOCK_USERS.find(function (u) {
      return u.username === body.username && u.password === body.password;
    });
    if (!u) throw new Error('Username atau password salah');
    return { data: { token: 'mock-token', username: u.username, role: u.role } };
  }

  // Scan In — box
  if (endpoint === '/scan-in/box') {
    return { data: { id_box: body.barcode_box } };
  }

  // Scan In — bag
  if (endpoint === '/scan-in/bag') {
    const bc = body.barcode_bag;
    if (!MOCK_BAGS[bc]) {
      MOCK_BAGS[bc] = {
        lotcode: ri(LOTS),
        qty:     rnd(200, 2000),
        size:    ri(SHOE_SIZES),
        nilai:   rnd(1, 12),
      };
    }
    const b = MOCK_BAGS[bc];
    return { data: { lotcode: b.lotcode, qty: b.qty, size: b.size, nilai: b.nilai } };
  }

  // Scan Out
  if (endpoint === '/scan-out') {
    const bc = body.barcode_bag;
    if (!MOCK_BAGS[bc]) {
      MOCK_BAGS[bc] = {
        lotcode: ri(LOTS),
        qty:     rnd(200, 2000),
        size:    ri(SHOE_SIZES),
        nilai:   rnd(1, 12),
      };
    }
    const b = MOCK_BAGS[bc];
    if (b.lotcode !== body.lotcode) {
      throw new Error('Lotcode tidak cocok dengan barcode bag ini');
    }
    return { data: { lotcode: b.lotcode, qty: b.qty, size: b.size, nilai: b.nilai } };
  }

  // Location — rak detail
  if (method === 'GET' && endpoint.startsWith('/location/rak/')) {
    const id = endpoint.replace('/location/rak/', '').split('?')[0];
    return { data: MOCK_RAK[id] || [] };
  }

  // Location — rak list
  if (method === 'GET' && endpoint.startsWith('/location/rak')) {
    const list = Object.keys(MOCK_RAK).map(function (id) {
      return { id_rak: id, jumlah_palet: MOCK_RAK[id].length, kapasitas: 16 };
    });
    return { data: list };
  }

  // Location — scan box into palet
  if (endpoint === '/location/scan-box') {
    const id = body.barcode_box;
    let found = null;
    Object.values(MOCK_RAK).forEach(function (pallets) {
      pallets.forEach(function (plt) {
        plt.boxes.forEach(function (bx) { if (bx.id_box === id) found = bx; });
      });
    });
    if (!found) {
      const lot  = ri(LOTS);
      const bags = [];
      for (let i = 0; i < rnd(2, 5); i++) {
        bags.push({
          barcode: '0211' + String(rnd(100000000, 999999999)),
          lotcode: lot,
          qty:     rnd(200, 2000),
          size:    ri(SHOE_SIZES),
          nilai:   rnd(1, 12),
        });
      }
      found = { id_box: id, bags };
    }
    return { data: found };
  }

  // Location — save palet
  if (endpoint === '/location/palet') {
    const now = new Date();
    const d   = now.getFullYear().toString()
              + String(now.getMonth() + 1).padStart(2, '0')
              + String(now.getDate()).padStart(2, '0');
    const cnt = (MOCK_RAK[body.kode_rak] || []).length;
    const nm  = 'PLT-' + d + '-' + (cnt + 1);
    if (!MOCK_RAK[body.kode_rak]) MOCK_RAK[body.kode_rak] = [];
    MOCK_RAK[body.kode_rak].push({ plt_name: nm, boxes: body.boxes });
    return { data: { plt_name: nm } };
  }

  // Report — today
  if (endpoint.startsWith('/report/today')) {
    return { data: MOCK_REPORT };
  }

  throw new Error('Endpoint tidak dikenal: ' + endpoint);
}

async function apiRequest(method, endpoint, body) {
  if (USE_MOCK) return mockRequest(method, endpoint, body || null);

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION.token) headers['Authorization'] = 'Bearer ' + SESSION.token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan server');
  return data;
}

// ─── UI HELPERS ───────────────────────────────────────

function show(id)      { const e = document.getElementById(id); if (e) e.style.display = 'block'; }
function hide(id)      { const e = document.getElementById(id); if (e) e.style.display = 'none';  }
function showFlex(id)  { const e = document.getElementById(id); if (e) e.style.display = 'flex';  }
function val(id)       { return document.getElementById(id).value.trim(); }
function setTxt(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function hideEl(id)    { hide(id); }

function showErr(id, msg) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent    = msg;
  e.style.display  = 'block';
}

function flashOk(id, msgId, msg, ms) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msgId) document.getElementById(msgId).textContent = msg;
  el.style.display = 'flex';
  setTimeout(function () { el.style.display = 'none'; }, ms || 2500);
}

// ─── PAGE NAVIGATION ──────────────────────────────────

function goPage(name) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('on'); });
  document.getElementById('page-' + name).classList.add('on');
  window.scrollTo(0, 0);
  if (name === 'scan-in')  siInit();
  if (name === 'scan-out') soInit();
  if (name === 'location') locInit();
  if (name === 'report')   rptInit();
}

// ─── INIT DROPDOWNS (called once after login) ─────────

function initDropdowns() {
  const lineEl = document.getElementById('so-line');
  if (lineEl && lineEl.options.length <= 1) {
    LINES.forEach(function (l) {
      const o   = document.createElement('option');
      o.value   = l;
      o.textContent = l;
      lineEl.appendChild(o);
    });
  }
}

// ══════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════

function togglePass() {
  const inp = document.getElementById('login-password');
  const ico = document.getElementById('eye-icon');
  if (inp.type === 'password') {
    inp.type      = 'text';
    ico.className = 'ti ti-eye-off';
  } else {
    inp.type      = 'password';
    ico.className = 'ti ti-eye';
  }
}

async function doLogin() {
  const username = val('login-username');
  const password = val('login-password');
  hideEl('login-err');

  if (!username || !password) {
    setTxt('login-err-msg', 'Username dan password wajib diisi');
    showFlex('login-err');
    return;
  }

  show('login-loading');
  try {
    const res = await apiRequest('POST', '/auth/login', { username, password });
    SESSION.token    = res.data.token;
    SESSION.username = res.data.username;
    SESSION.role     = res.data.role;
    setTxt('dash-username', SESSION.username);
    setTxt('dash-role',     SESSION.role);
    initDropdowns();
    goPage('dashboard');
  } catch (err) {
    setTxt('login-err-msg', err.message || 'Login gagal');
    showFlex('login-err');
  } finally {
    hide('login-loading');
  }
}

function doLogout() {
  SESSION = { token: null, username: null, role: null };
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  goPage('login');
}

// ══════════════════════════════════════════════════════
//  SCAN IN  —  1 input, auto-detect BOX vs BAG
// ══════════════════════════════════════════════════════

let siData  = [];
let siIdBox = null;

function siInit() {
  siData  = [];
  siIdBox = null;
  document.getElementById('si-input').value = '';
  hideEl('si-err');
  hideEl('si-ok');
  hideEl('si-box-active');
  siSetFlow('box');
  siRenderTable();
}

function siSetFlow(step) {
  const order = ['box', 'bag', 'done'];
  const idx   = order.indexOf(step);
  order.forEach(function (s, i) {
    const el = document.getElementById('fl-' + s);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (i < idx)        el.classList.add('done');
    else if (i === idx) el.classList.add('active');
  });
}

async function siScan() {
  const input = val('si-input');
  hideEl('si-err');
  hideEl('si-ok');
  if (!input) { showErr('si-err', 'Barcode wajib diisi'); return; }

  if (input.toUpperCase().startsWith('BOX-')) {
    await siProcessBox(input.toUpperCase());
  } else {
    await siProcessBag(input);
  }
}

async function siProcessBox(barcode) {
  show('si-loading');
  try {
    const res = await apiRequest('POST', '/scan-in/box', {
      barcode_box: barcode,
      username:    SESSION.username,
    });
    siIdBox = res.data.id_box;
    setTxt('si-box-info', barcode + ' → ID: ' + siIdBox);
    showFlex('si-box-active');
    setTxt('si-hint', 'Scan bag sekarang');
    siSetFlow('bag');
    flashOk('si-ok', 'si-ok-msg', 'Box aktif: ' + siIdBox + ' — scan bag sekarang');
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();
  } catch (err) {
    showErr('si-err', err.message);
  } finally {
    hide('si-loading');
  }
}

async function siProcessBag(barcode) {
  if (!siIdBox) {
    showErr('si-err', 'Scan box dulu sebelum scan bag');
    return;
  }
  if (!/^0211\d{9}$/.test(barcode)) {
    showErr('si-err', 'Format bag tidak valid (awali 0211, 13 digit)');
    return;
  }
  if (siData.find(function (d) { return d.barcode === barcode; })) {
    showErr('si-err', 'Barcode bag ini sudah discan');
    return;
  }

  show('si-loading');
  try {
    const res = await apiRequest('POST', '/scan-in/bag', {
      barcode_bag: barcode,
      username:    SESSION.username,
    });
    siData.push({
      barcode:  barcode,
      lotcode:  res.data.lotcode,
      qty:      res.data.qty,
      size:     res.data.size,
      nilai:    res.data.nilai,
      id_box:   siIdBox,
    });
    siRenderTable();
    flashOk('si-ok', 'si-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · QTY:' + res.data.qty +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' pairs'
    );
    siSetFlow('done');
    setTimeout(function () { siSetFlow('bag'); }, 1500);
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();
  } catch (err) {
    showErr('si-err', err.message);
  } finally {
    hide('si-loading');
  }
}

function siDeleteRow(i) { siData.splice(i, 1); siRenderTable(); }

function siRenderTable() {
  const tbody = document.getElementById('si-tbody');
  const tot   = document.getElementById('si-total');

  if (!siData.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  let totalPairs = 0;
  tbody.innerHTML = siData.map(function (d, i) {
    totalPairs += d.nilai;
    return '<tr>' +
      '<td class="mono">' + d.barcode + '</td>' +
      '<td>' + d.lotcode + '</td>' +
      '<td class="tc">' + d.qty + '</td>' +
      '<td class="tc">' + d.size + '</td>' +
      '<td class="tc">' + d.nilai + ' pairs</td>' +
      '<td class="mono">' + d.id_box + '</td>' +
      '<td><button class="del-btn" onclick="siDeleteRow(' + i + ')">' +
        '<i class="ti ti-trash" style="font-size:14px"></i>' +
      '</button></td>' +
    '</tr>';
  }).join('');

  setTxt('si-total-bag',   siData.length);
  setTxt('si-total-pairs', totalPairs + ' pairs');
  tot.style.display = 'flex';
}

// ══════════════════════════════════════════════════════
//  SCAN OUT
// ══════════════════════════════════════════════════════

let soData = [];

function soInit() {
  soData = [];
  soRenderTable();
  document.getElementById('so-barcode').value = '';
  document.getElementById('so-lotcode').value = '';
  document.getElementById('so-line').value    = '';
  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');
}

async function soScan() {
  const line    = val('so-line');
  const lotcode = val('so-lotcode');
  const barcode = val('so-barcode');
  let valid = true;

  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');

  if (!line)    { showErr('so-line-err', 'Line wajib dipilih'); valid = false; }
  if (!lotcode) { showErr('so-lot-err',  'Lot code wajib diisi'); valid = false; }
  if (!barcode || !/^0211\d{9}$/.test(barcode)) {
    showErr('so-bc-err', 'Format tidak valid (awali 0211, 13 digit)');
    valid = false;
  }
  if (!valid) return;

  if (soData.find(function (d) { return d.barcode === barcode; })) {
    showErr('so-bc-err', 'Barcode ini sudah discan');
    return;
  }

  show('so-loading');
  try {
    const res = await apiRequest('POST', '/scan-out', {
      lotcode:     lotcode,
      barcode_bag: barcode,
      line:        line,
      username:    SESSION.username,
    });
    soData.push({
      barcode:  barcode,
      lotcode:  res.data.lotcode,
      qty:      res.data.qty,
      size:     res.data.size,
      nilai:    res.data.nilai,
      line:     line,
    });
    soRenderTable();
    flashOk('so-ok', 'so-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' pairs · ' + line
    );
    document.getElementById('so-barcode').value = '';
    document.getElementById('so-barcode').focus();
  } catch (err) {
    showErr('so-bc-err', err.message);
  } finally {
    hide('so-loading');
  }
}

function soDelete(i) { soData.splice(i, 1); soRenderTable(); }

function soRenderTable() {
  const tbody = document.getElementById('so-tbody');
  const tot   = document.getElementById('so-total');

  if (!soData.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  let totalPairs = 0;
  tbody.innerHTML = soData.map(function (d, i) {
    totalPairs += d.nilai;
    return '<tr>' +
      '<td class="mono">' + d.barcode + '</td>' +
      '<td>' + d.lotcode + '</td>' +
      '<td class="tc">' + d.qty + '</td>' +
      '<td class="tc">' + d.size + '</td>' +
      '<td class="tc">' + d.nilai + ' pairs</td>' +
      '<td>' + d.line + '</td>' +
      '<td><button class="del-btn" onclick="soDelete(' + i + ')">' +
        '<i class="ti ti-trash" style="font-size:14px"></i>' +
      '</button></td>' +
    '</tr>';
  }).join('');

  setTxt('so-total-bag',   soData.length);
  setTxt('so-total-pairs', totalPairs + ' pairs');
  tot.style.display = 'flex';
}

// ══════════════════════════════════════════════════════
//  LOCATION
// ══════════════════════════════════════════════════════

const LOC_CAP = 16;
let locSelRak = null;
let locBoxes  = [];

async function locInit() {
  locSetPg(1);
  show('loc-loading');
  try {
    const res = await apiRequest('GET', '/location/rak?username=' + SESSION.username);
    locRenderGrid(res.data);
  } catch (err) {
    console.error('Gagal load denah:', err.message);
  } finally {
    hide('loc-loading');
  }
}

function locRenderGrid(rakList) {
  const map = {};
  rakList.forEach(function (r) { map[r.id_rak] = r.jumlah_palet; });

  function c(id)   { return map[id] || 0; }
  function cls(id) {
    const n = c(id);
    if (n === 0)      return 'st-empty';
    if (n >= LOC_CAP) return 'st-full';
    return 'st-some';
  }

  const T = document.getElementById('cell-T');
  T.className = 'tmp-row ' + cls('Temporary');
  T.innerHTML =
    '<span>Temporary</span>' +
    '<span style="font-size:11px;opacity:.85">' + c('Temporary') + '/' + LOC_CAP + '</span>';

  ['a', 'b'].forEach(function (z) {
    const grid = document.getElementById('grid-' + z);
    grid.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const id  = (z === 'a' ? 'A' : 'B') + i;
      const cnt = c(id);
      const d   = document.createElement('div');
      d.className = 'rak-cell ' + cls(id);
      d.innerHTML =
        '<div>' +
          '<div>' + id + '</div>' +
          '<div class="sub">' + cnt + '/' + LOC_CAP + '</div>' +
        '</div>';
      d.onclick = function () { locPick(id); };
      grid.appendChild(d);
    }
  });

  let some = 0, full = 0, empty = 0;
  rakList.forEach(function (r) {
    const n = r.jumlah_palet;
    if (n === 0)           empty++;
    else if (n >= LOC_CAP) full++;
    else                   some++;
  });
  setTxt('stat-some',  some);
  setTxt('stat-full',  full);
  setTxt('stat-empty', empty);
}

function locPick(id) {
  locSelRak = id;
  locSetPg(2);
  locSetBc(2);
  locLoadRak(id);
}

async function locLoadRak(id) {
  setTxt('p2-lok', id);
  setTxt('p2-kap', 'Memuat...');
  show('p2-loading');
  document.getElementById('p2-body').innerHTML = '';
  document.getElementById('btn-add-plt').style.display = 'none';

  try {
    const res = await apiRequest('GET', '/location/rak/' + id + '?username=' + SESSION.username);
    locRenderP2(res.data);
  } catch (err) {
    document.getElementById('p2-body').innerHTML =
      '<div class="card"><p style="color:var(--red-t);font-size:13px;text-align:center;padding:16px">' +
      err.message + '</p></div>';
  } finally {
    hide('p2-loading');
  }
}

// Group rows: Lotcode + QTY + Size sama → sum nilai (pairs)
function locGroup(boxes) {
  const map = {};
  boxes.forEach(function (bx) {
    bx.bags.forEach(function (b) {
      const k = b.lotcode + '||' + b.qty + '||' + b.size;
      if (!map[k]) map[k] = { lotcode: b.lotcode, qty: b.qty, size: b.size, nilai: 0 };
      map[k].nilai += b.nilai;
    });
  });
  return Object.values(map).sort(function (a, b) {
    return a.lotcode.localeCompare(b.lotcode) || Number(a.size) - Number(b.size);
  });
}

function locRenderP2(pallets) {
  const cnt  = pallets.length;
  const full = cnt >= LOC_CAP;

  setTxt('p2-kap', cnt + '/' + LOC_CAP + ' palet terisi');
  document.getElementById('btn-add-plt').style.display = full ? 'none' : 'flex';

  const body = document.getElementById('p2-body');

  if (!pallets.length) {
    body.innerHTML =
      '<div class="card">' +
        '<div class="empty-state">' +
          '<i class="ti ti-packages"></i>' +
          '<p>Rak <strong>' + locSelRak + '</strong> kosong</p>' +
          '<small>Belum ada palet di rak ini</small>' +
          '<button class="btn-info" onclick="locOpenP3()" style="margin:0 auto">' +
            '<i class="ti ti-plus"></i> Tambahkan Palet' +
          '</button>' +
        '</div>' +
      '</div>';
    return;
  }

  let html = '';
  pallets.forEach(function (plt, pi) {
    const grouped    = locGroup(plt.boxes);
    const totalPairs = grouped.reduce(function (a, x) { return a + x.nilai; }, 0);

    html +=
      '<div class="plt-card">' +
        '<div class="plt-head">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div class="plt-badge">P' + (pi + 1) + '</div>' +
            '<div>' +
              '<div class="plt-name">' + plt.plt_name + '</div>' +
              '<div class="plt-meta">' + plt.boxes.length + ' box</div>' +
            '</div>' +
          '</div>' +
          '<div class="plt-total">' +
            '<div class="plt-total-lbl">Total</div>' +
            '<div class="plt-total-val">' + totalPairs + ' pairs</div>' +
          '</div>' +
        '</div>' +
        '<div class="tbl-scroll"><table>' +
          '<thead><tr>' +
            '<th>Lotcode</th>' +
            '<th class="tr">QTY</th>' +
            '<th class="tc">Size</th>' +
            '<th class="tr">Nilai</th>' +
          '</tr></thead>' +
          '<tbody>' +
          grouped.map(function (r) {
            return '<tr>' +
              '<td>' + r.lotcode + '</td>' +
              '<td class="tr">' + r.qty + '</td>' +
              '<td class="tc">' + r.size + '</td>' +
              '<td class="tr">' + r.nilai + ' pairs</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>' +
      '</div>';
  });

  if (!full) {
    html +=
      '<button class="btn-dashed" onclick="locOpenP3()">' +
        '<i class="ti ti-plus"></i> Tambahkan Palet (' + cnt + '/' + LOC_CAP + ' terisi)' +
      '</button>';
  }

  body.innerHTML = html;
}

function locOpenP3() {
  locBoxes = [];
  const now = new Date();
  const d   =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  setTxt('p3-sub', locSelRak + ' · PLT-' + d + '-? (ditetapkan server)');
  setTxt('p3-cnt', '0 box');
  document.getElementById('p3-bc').value = '';

  ['p3-err', 'p3-ok', 'p3-loading', 'p3-save', 'p3-saving', 'p3-done'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  locRenderP3();
  locSetPg(3);
  locSetBc(3);
  setTimeout(function () { document.getElementById('p3-bc').focus(); }, 100);
}

async function locScanBox() {
  const barcode = val('p3-bc');
  const errEl   = document.getElementById('p3-err');
  errEl.style.display = 'none';
  hideEl('p3-ok');

  if (!barcode) {
    errEl.textContent   = 'Barcode box wajib diisi';
    errEl.style.display = 'block';
    return;
  }
  if (locBoxes.find(function (b) { return b.id_box === barcode; })) {
    errEl.textContent   = 'Box ini sudah discan';
    errEl.style.display = 'block';
    return;
  }

  show('p3-loading');
  try {
    const res = await apiRequest('POST', '/location/scan-box', {
      barcode_box: barcode,
      kode_rak:    locSelRak,
      username:    SESSION.username,
    });
    const box        = res.data;
    const totalPairs = box.bags.reduce(function (a, b) { return a + b.nilai; }, 0);
    locBoxes.push({ id_box: box.id_box, bags: box.bags, totalPairs });
    locRenderP3();
    flashOk('p3-ok', 'p3-ok-msg',
      box.id_box + ' · ' + box.bags.length + ' bag · ' + totalPairs + ' pairs'
    );
    document.getElementById('p3-bc').value = '';
    document.getElementById('p3-bc').focus();
  } catch (err) {
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  } finally {
    hide('p3-loading');
  }
}

function locDelBox(i) { locBoxes.splice(i, 1); locRenderP3(); }

function locRenderP3() {
  const tbody   = document.getElementById('p3-tbody');
  const tot     = document.getElementById('p3-total');
  const saveBtn = document.getElementById('p3-save');

  setTxt('p3-cnt', locBoxes.length + ' box');

  if (!locBoxes.length) {
    tbody.innerHTML   = '<tr><td colspan="6" class="empty-cell">Belum ada box</td></tr>';
    tot.style.display = 'none';
    saveBtn.style.display = 'none';
    return;
  }

  let totalPairs = 0;
  tbody.innerHTML = locBoxes.map(function (b, i) {
    totalPairs += b.totalPairs;
    const lots  = [...new Set(b.bags.map(function (x) { return x.lotcode; }))].join(', ');
    const sizes = [...new Set(b.bags.map(function (x) { return x.size; }))].slice(0, 3).join('/');
    return '<tr>' +
      '<td class="mono">' + b.id_box + '</td>' +
      '<td>' + lots + '</td>' +
      '<td class="tc">' + (b.bags[0] ? b.bags[0].qty : '—') + '</td>' +
      '<td class="tc">' + sizes + '</td>' +
      '<td class="tc">' + b.totalPairs + ' pairs</td>' +
      '<td><button class="del-btn" onclick="locDelBox(' + i + ')">' +
        '<i class="ti ti-trash" style="font-size:14px"></i>' +
      '</button></td>' +
    '</tr>';
  }).join('');

  setTxt('p3-total-n',     locBoxes.length);
  setTxt('p3-total-pairs', totalPairs + ' pairs');
  tot.style.display     = 'flex';
  saveBtn.style.display = 'flex';
}

async function locSavePalet() {
  if (!locBoxes.length) return;
  hide('p3-save');
  show('p3-saving');
  try {
    const res = await apiRequest('POST', '/location/palet', {
      kode_rak: locSelRak,
      username: SESSION.username,
      boxes:    locBoxes.map(function (b) { return { id_box: b.id_box, bags: b.bags }; }),
    });
    const totalPairs = locBoxes.reduce(function (a, b) { return a + b.totalPairs; }, 0);
    setTxt('p3-done-msg',
      res.data.plt_name + ' · ' + locBoxes.length + ' box · ' +
      totalPairs + ' pairs · Rak ' + locSelRak
    );
    hide('p3-saving');
    show('p3-done');
    locBoxes = [];
  } catch (err) {
    hide('p3-saving');
    show('p3-save');
    const errEl = document.getElementById('p3-err');
    errEl.textContent   = err.message;
    errEl.style.display = 'block';
  }
}

function locLagi() { hide('p3-done'); locOpenP3(); }

// Sub-page navigation helpers
function locSetBc(n) {
  const bc1 = document.getElementById('bc1');
  const bc2 = document.getElementById('bc2');
  const bc3 = document.getElementById('bc3');
  const bs2 = document.getElementById('bc-s2');
  const bs3 = document.getElementById('bc-s3');

  bc1.className = 'bc-link';
  bc2.className = 'bc-link';

  if (n === 1) {
    bc1.className      = 'bc-active';
    bs2.style.display  = 'none';
    bc2.style.display  = 'none';
    bs3.style.display  = 'none';
    bc3.style.display  = 'none';
  } else if (n === 2) {
    bc2.textContent    = locSelRak;
    bc2.className      = 'bc-active';
    bs2.style.display  = 'inline';
    bc2.style.display  = 'inline';
    bs3.style.display  = 'none';
    bc3.style.display  = 'none';
  } else {
    bc2.textContent    = locSelRak;
    bs2.style.display  = 'inline';
    bc2.style.display  = 'inline';
    bs3.style.display  = 'inline';
    bc3.style.display  = 'inline';
  }
}

function locSetPg(n) {
  document.querySelectorAll('.loc-pg').forEach(function (p) { p.classList.remove('on'); });
  document.getElementById('loc-pg' + n).classList.add('on');
  window.scrollTo(0, 0);
}

function locGo(n) {
  locSetPg(n);
  locSetBc(n);
  if (n === 1) locInit();
  else if (n === 2 && locSelRak) locLoadRak(locSelRak);
}

// ══════════════════════════════════════════════════════
//  REPORT
// ══════════════════════════════════════════════════════

let rptData = [];

async function rptInit() {
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  setTxt('rpt-date', now.toLocaleDateString('id-ID', opts));
  document.getElementById('rpt-search').value = '';

  try {
    const res = await apiRequest('GET', '/report/today?username=' + SESSION.username);
    rptData   = res.data;

    const totalIn  = rptData.reduce(function (a, d) { return a + d.input;  }, 0);
    const totalOut = rptData.reduce(function (a, d) { return a + d.output; }, 0);
    const cntIn    = rptData.filter(function (d) { return d.input  > 0; }).length;
    const cntOut   = rptData.filter(function (d) { return d.output > 0; }).length;

    setTxt('rpt-in-val',  totalIn  + ' pairs');
    setTxt('rpt-in-sub',  cntIn    + ' lotcode');
    setTxt('rpt-out-val', totalOut + ' pairs');
    setTxt('rpt-out-sub', cntOut   + ' lotcode');

    rptRender();
  } catch (err) {
    console.error('Gagal load report:', err.message);
  }
}

function rptRender() {
  const q    = (document.getElementById('rpt-search').value || '').toLowerCase();
  const rows = rptData.filter(function (d) {
    return !q || d.lotcode.toLowerCase().includes(q);
  });

  const tbody = document.getElementById('rpt-tbody');
  const tfoot = document.getElementById('rpt-tfoot');

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--t4);font-size:12px">' +
      'Tidak ada data</td></tr>';
    tfoot.innerHTML = '';
    setTxt('rpt-showing', '0');
    setTxt('rpt-net', '0 pairs');
    return;
  }

  tbody.innerHTML = rows.map(function (d) {
    return '<tr>' +
      '<td class="lot-main">' + d.lotcode + '</td>' +
      '<td class="qty-val">' + d.qty.toLocaleString('id-ID') + '</td>' +
      '<td class="in-val">'  + d.input  + '</td>' +
      '<td class="out-val">' + d.output + '</td>' +
    '</tr>';
  }).join('');

  const tIn  = rows.reduce(function (a, d) { return a + d.input;  }, 0);
  const tOut = rows.reduce(function (a, d) { return a + d.output; }, 0);
  const net  = tIn - tOut;

  tfoot.innerHTML =
    '<tr style="background:var(--border-lt)">' +
      '<td style="padding:7px 8px;font-size:10px;font-weight:600;color:var(--t3)">TOTAL</td>' +
      '<td class="qty-val" style="padding:7px 8px">—</td>' +
      '<td class="in-val"  style="padding:7px 8px">' + tIn  + '</td>' +
      '<td class="out-val" style="padding:7px 8px">' + tOut + '</td>' +
    '</tr>';

  setTxt('rpt-showing', rows.length);
  setTxt('rpt-net',     net + ' pairs');
}

// ─── REPORT PATCH: Line column + export ───────────────

// Override MOCK_REPORT with line data
(function () {
  // Rebuild mock report dengan kolom line
  const rows = [];
  const usedLines = LINES.slice(0, 10);
  usedLines.forEach(function (line) {
    var numLots = rnd(1, 3);
    for (var i = 0; i < numLots; i++) {
      rows.push({
        line:    line,
        lotcode: ri(LOTS),
        qty:     rnd(500, 3000),
        input:   rnd(0, 150),
        output:  rnd(0, 80),
      });
    }
  });
  // Ganti MOCK_REPORT (patch endpoint)
  window.__MOCK_REPORT_V2 = rows;
}());

// Patch apiRequest untuk /report/today gunakan data baru
var _origApiRequest = apiRequest;
apiRequest = async function (method, endpoint, body) {
  if (endpoint.startsWith('/report/today') && USE_MOCK) {
    await (function(ms){ return new Promise(function(r){setTimeout(r,ms||500);}); })();
    return { data: window.__MOCK_REPORT_V2 };
  }
  return _origApiRequest(method, endpoint, body);
};

// Override rptInit: isi dropdown line + update stat cards
var _origRptInit = rptInit;
rptInit = async function () {
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  setTxt('rpt-date', now.toLocaleDateString('id-ID', opts));
  document.getElementById('rpt-search').value = '';

  // Isi dropdown line
  const lineEl = document.getElementById('rpt-line');
  if (lineEl && lineEl.options.length <= 1) {
    LINES.slice(0, 10).forEach(function (l) {
      var o = document.createElement('option');
      o.value = l; o.textContent = l;
      lineEl.appendChild(o);
    });
  }

  try {
    const res = await apiRequest('GET', '/report/today?username=' + SESSION.username);
    rptData   = res.data;

    const totalIn  = rptData.reduce(function (a, d) { return a + d.input;  }, 0);
    const totalOut = rptData.reduce(function (a, d) { return a + d.output; }, 0);
    const cntIn    = rptData.filter(function (d) { return d.input  > 0; }).length;
    const cntOut   = rptData.filter(function (d) { return d.output > 0; }).length;

    setTxt('rpt-in-val',  totalIn  + ' pairs');
    setTxt('rpt-in-sub',  cntIn    + ' baris');
    setTxt('rpt-out-val', totalOut + ' pairs');
    setTxt('rpt-out-sub', cntOut   + ' baris');

    rptRender();
  } catch (err) {
    console.error('Gagal load report:', err.message);
  }
};

// Override rptRender: tambah filter line + kolom Line
rptRender = function () {
  const q      = (document.getElementById('rpt-search').value || '').toLowerCase();
  const selLine = (document.getElementById('rpt-line') || {}).value || '';

  const rows = rptData.filter(function (d) {
    const matchQ    = !q || d.lotcode.toLowerCase().includes(q) || (d.line||'').toLowerCase().includes(q);
    const matchLine = !selLine || d.line === selLine;
    return matchQ && matchLine;
  });

  const tbody = document.getElementById('rpt-tbody');
  const tfoot = document.getElementById('rpt-tfoot');

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--t4);font-size:12px">' +
      'Tidak ada data</td></tr>';
    tfoot.innerHTML = '';
    setTxt('rpt-showing', '0');
    setTxt('rpt-net', '0 pairs');
    return;
  }

  tbody.innerHTML = rows.map(function (d) {
    return '<tr>' +
      '<td>' + (d.line || '—') + '</td>' +
      '<td class="lot-main">' + d.lotcode + '</td>' +
      '<td class="qty-val">' + d.qty.toLocaleString('id-ID') + '</td>' +
      '<td class="in-val">'  + d.input  + '</td>' +
      '<td class="out-val">' + d.output + '</td>' +
    '</tr>';
  }).join('');

  const tIn  = rows.reduce(function (a, d) { return a + d.input;  }, 0);
  const tOut = rows.reduce(function (a, d) { return a + d.output; }, 0);
  const net  = tIn - tOut;

  tfoot.innerHTML =
    '<tr style="background:#f9fafb">' +
      '<td style="padding:7px 8px;font-size:10px;font-weight:600;color:#9ca3af">TOTAL</td>' +
      '<td style="padding:7px 8px">—</td>' +
      '<td class="qty-val" style="padding:7px 8px">—</td>' +
      '<td class="in-val"  style="padding:7px 8px">' + tIn  + '</td>' +
      '<td class="out-val" style="padding:7px 8px">' + tOut + '</td>' +
    '</tr>';

  setTxt('rpt-showing', rows.length);
  setTxt('rpt-net',     net + ' pairs');
};

// Ekspor tabel sebagai gambar (html2canvas CDN)
function rptExport() {
  // Load html2canvas jika belum ada
  if (!window.html2canvas) {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = function () { _doExport(); };
    document.head.appendChild(script);
  } else {
    _doExport();
  }
}

function _doExport() {
  var card = document.getElementById('rpt-card');
  var btn  = card.querySelector('.btn-export');

  // Sembunyikan tombol export saat capture
  btn.style.display = 'none';

  var now  = new Date();
  var fname = 'laporan-' +
    now.getFullYear() +
    String(now.getMonth()+1).padStart(2,'0') +
    String(now.getDate()).padStart(2,'0') + '.png';

  html2canvas(card, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  }).then(function (canvas) {
    btn.style.display = '';
    var link = document.createElement('a');
    link.download = fname;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(function (err) {
    btn.style.display = '';
    console.error('Export gagal:', err);
    alert('Export gagal: ' + err.message);
  });
}
