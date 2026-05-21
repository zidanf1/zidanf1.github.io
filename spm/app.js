/* ============================================================
   SMS — app.js
   Supermarket Management System
   
   File ini menangani semua logika frontend:
   - Komunikasi ke API backend (fetch)
   - Navigasi antar halaman
   - Validasi input
   - Render tabel & UI
   ============================================================ */


/* ============================================================
   1. KONFIGURASI
   ============================================================ */

// URL dasar API backend — ganti sesuai server Anda
const API_BASE = 'https://your-api.com/api';

// Data user yang sedang login, diisi saat login berhasil
let SESSION = {
  token:    null, // JWT token untuk autentikasi setiap request
  username: null, // username user
  role:     null, // role: Admin / Operator
};


/* ============================================================
   2. KONSTANTA
   ============================================================ */

// Ukuran sepatu: dari 1 sampai 18, interval 0.5 (total 35 pilihan)
const SHOE_SIZES = [];
for (let s = 1; s <= 18; s += 0.5) {
  SHOE_SIZES.push(String(s)); // simpan sebagai string: "1", "1.5", dst
}

// Line produksi: Line 1 sampai Line 25
const LINES = Array.from({ length: 25 }, (_, i) => 'Line ' + (i + 1));


/* ============================================================
   3. FUNGSI API
   ============================================================ */

/**
 * Kirim request ke API backend
 *
 * Cara pakai:
 *   const res = await apiRequest('POST', '/scan-in/bag', { barcode_bag: '...', username: '...' })
 *   console.log(res.data) // hasil dari server
 *
 * @param {string} method   - Method HTTP: 'GET' atau 'POST'
 * @param {string} endpoint - Path endpoint, contoh: '/scan-in/bag'
 * @param {object} body     - Data yang dikirim (hanya untuk POST)
 * @returns {object}        - Response JSON dari server
 * @throws {Error}          - Jika server mengembalikan error
 */
async function apiRequest(method, endpoint, body = null) {

  // Siapkan header request
  const headers = {
    'Content-Type': 'application/json', // kirim dan terima JSON
  };

  // Tambahkan token jika user sudah login
  if (SESSION.token) {
    headers['Authorization'] = 'Bearer ' + SESSION.token;
  }

  // Siapkan opsi fetch
  const options = { method, headers };

  // Tambahkan body jika ada (untuk POST)
  if (body) {
    options.body = JSON.stringify(body); // ubah object JS ke string JSON
  }

  // Kirim request ke server
  const response = await fetch(API_BASE + endpoint, options);

  // Parse response sebagai JSON
  const data = await response.json();

  // Jika status bukan 2xx, lempar error dengan pesan dari server
  if (!response.ok) {
    throw new Error(data.message || 'Terjadi kesalahan server');
  }

  return data; // kembalikan data jika sukses
}


/* ============================================================
   4. FUNGSI BANTU UI
   ============================================================ */

/** Tampilkan element HTML (ubah display ke 'block') */
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

/** Sembunyikan element HTML (ubah display ke 'none') */
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/** Tampilkan element HTML dengan display 'flex' */
function showFlex(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

/** Ambil value dari input dan buang spasi di awal/akhir */
function val(id) {
  return document.getElementById(id).value.trim();
}

/** Ubah teks konten suatu element */
function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Tampilkan pesan error pada element
 * @param {string} id  - id element yang akan menampilkan error
 * @param {string} msg - pesan error yang ditampilkan
 */
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent   = msg;  // isi pesan error
  el.style.display = 'block'; // tampilkan
}

/** Sembunyikan element (alias hide) */
function hideEl(id) {
  hide(id);
}

/**
 * Tampilkan notifikasi sukses sementara, lalu sembunyikan otomatis
 * @param {string} id    - id container notifikasi
 * @param {string} msgId - id element teks (bisa null)
 * @param {string} msg   - pesan yang ditampilkan
 * @param {number} ms    - durasi tampil dalam milidetik (default: 2500)
 */
function flashOk(id, msgId, msg, ms = 2500) {
  const el = document.getElementById(id);
  if (!el) return;

  // Isi pesan jika ada elemen teks terpisah
  if (msgId) {
    document.getElementById(msgId).textContent = msg;
  }

  el.style.display = 'flex'; // tampilkan notifikasi

  // Sembunyikan otomatis setelah `ms` milidetik
  setTimeout(() => { el.style.display = 'none'; }, ms);
}


/* ============================================================
   5. NAVIGASI HALAMAN
   ============================================================ */

/**
 * Pindah ke halaman tertentu
 * Setiap halaman memiliki fungsi inisialisasi yang dipanggil saat dibuka
 *
 * @param {string} name - nama halaman: 'login' | 'dashboard' | 'scan-in' | 'scan-out' | 'location' | 'report'
 */
function goPage(name) {
  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));

  // Tampilkan halaman yang dituju
  document.getElementById('page-' + name).classList.add('on');

  // Scroll ke atas
  window.scrollTo(0, 0);

  // Jalankan inisialisasi halaman yang sesuai
  if (name === 'scan-in')  siInit();
  if (name === 'scan-out') soInit();
  if (name === 'location') locInit();
  if (name === 'report')   rptInit();
}

/**
 * Isi dropdown Line di halaman Scan Out dan Report
 * Dipanggil sekali setelah login berhasil
 */
function initDropdowns() {

  // Dropdown Line di Scan Out
  const soLineEl = document.getElementById('so-line');
  if (soLineEl && soLineEl.options.length <= 1) {
    LINES.forEach(line => {
      const option       = document.createElement('option');
      option.value       = line;
      option.textContent = line;
      soLineEl.appendChild(option);
    });
  }

  // Dropdown filter Line di Report
  const rptLineEl = document.getElementById('rpt-line');
  if (rptLineEl && rptLineEl.options.length <= 1) {
    LINES.forEach(line => {
      const option       = document.createElement('option');
      option.value       = line;
      option.textContent = line;
      rptLineEl.appendChild(option);
    });
  }
}


/* ============================================================
   6. LOGIN
   ============================================================ */

/** Toggle tampil / sembunyikan password di input */
function togglePass() {
  const input = document.getElementById('login-password');
  const icon  = document.getElementById('eye-icon');

  if (input.type === 'password') {
    input.type      = 'text';           // tampilkan teks
    icon.className  = 'ti ti-eye-off';  // ganti ikon
  } else {
    input.type      = 'password';       // sembunyikan teks
    icon.className  = 'ti ti-eye';      // kembalikan ikon
  }
}

/**
 * Proses login:
 * 1. Validasi input tidak kosong
 * 2. Kirim ke POST /auth/login
 * 3. Simpan token & data user ke SESSION
 * 4. Navigasi ke dashboard
 */
async function doLogin() {
  const username = val('login-username'); // ambil nilai input username
  const password = val('login-password'); // ambil nilai input password

  // Sembunyikan error sebelumnya
  hideEl('login-err');

  // Validasi: username dan password wajib diisi
  if (!username || !password) {
    setTxt('login-err-msg', 'Username dan password wajib diisi');
    showFlex('login-err');
    return; // hentikan proses
  }

  show('login-loading'); // tampilkan indikator loading

  try {
    // Kirim request login ke server
    const res = await apiRequest('POST', '/auth/login', { username, password });

    // Simpan data session dari response
    SESSION.token    = res.data.token;
    SESSION.username = res.data.username;
    SESSION.role     = res.data.role;

    // Tampilkan nama & role di dashboard
    setTxt('dash-username', SESSION.username);
    setTxt('dash-role',     SESSION.role);

    // Isi dropdown (Line) setelah login
    initDropdowns();

    // Pindah ke halaman dashboard
    goPage('dashboard');

  } catch (err) {
    // Tampilkan pesan error dari server
    setTxt('login-err-msg', err.message || 'Login gagal');
    showFlex('login-err');
  } finally {
    hide('login-loading'); // sembunyikan loading bagaimanapun hasilnya
  }
}

/**
 * Proses logout:
 * - Hapus data session
 * - Bersihkan input login
 * - Kembali ke halaman login
 */
function doLogout() {
  SESSION = { token: null, username: null, role: null }; // hapus session

  // Kosongkan input login
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';

  goPage('login'); // kembali ke halaman login
}


/* ============================================================
   7. SCAN IN
   
   ALUR:
   Scan Box → Scan Bag (berulang) → Ganti Box → Scan Bag → dst
   
   Input tunggal — sistem otomatis deteksi jenis:
   ● Awalan "BOX-"      → proses sebagai Box
   ● Format 0211XXXXXXXXX → proses sebagai Bag
   
   Data ke server:
   ● Scan Box : POST /scan-in/box  → { barcode_box, username }
   ● Scan Bag : POST /scan-in/bag  → { barcode_bag, username }

   Response dari server:
   ● Scan Box : { id_box }
   ● Scan Bag : { lotcode, qty, size, nilai }
   ============================================================ */

let siData  = []; // menyimpan semua baris tabel Scan In
let siIdBox = null; // id_box aktif dari server (diset saat scan box)

/** Inisialisasi halaman Scan In — reset semua state */
function siInit() {
  siData  = [];   // kosongkan data tabel
  siIdBox = null; // reset box aktif

  // Kosongkan input
  document.getElementById('si-input').value = '';

  // Sembunyikan semua notifikasi
  hideEl('si-err');
  hideEl('si-ok');
  hideEl('si-box-active');

  // Set flowchart ke langkah pertama
  siSetFlow('box');

  // Render tabel kosong
  siRenderTable();
}

/**
 * Update tampilan flowchart (Scan Box → Scan Bag → Selesai)
 * Langkah sebelumnya ditandai 'done', langkah aktif ditandai 'active'
 *
 * @param {string} step - 'box' | 'bag' | 'done'
 */
function siSetFlow(step) {
  const steps = ['box', 'bag', 'done']; // urutan langkah
  const activeIdx = steps.indexOf(step); // index langkah yang aktif

  steps.forEach((s, i) => {
    const el = document.getElementById('fl-' + s);
    if (!el) return;

    el.classList.remove('active', 'done'); // reset semua class

    if (i < activeIdx)       el.classList.add('done');   // langkah sebelumnya → hijau
    else if (i === activeIdx) el.classList.add('active'); // langkah aktif → biru
    // langkah setelahnya tetap abu-abu (tidak ada class)
  });
}

/** Dipanggil saat tombol Scan ditekan — deteksi jenis barcode */
async function siScan() {
  const input = val('si-input'); // ambil nilai input

  // Reset notifikasi
  hideEl('si-err');
  hideEl('si-ok');

  // Validasi tidak kosong
  if (!input) {
    showErr('si-err', 'Barcode wajib diisi');
    return;
  }

  // Deteksi jenis barcode berdasarkan awalan
  if (input.toUpperCase().startsWith('BOX-')) {
    await siProcessBox(input.toUpperCase()); // proses sebagai box
  } else {
    await siProcessBag(input); // proses sebagai bag
  }
}

/**
 * Proses scan box:
 * 1. Kirim ke server → dapat id_box
 * 2. Simpan id_box sebagai box aktif
 * 3. Update flowchart ke langkah scan bag
 */
async function siProcessBox(barcode) {
  show('si-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/scan-in/box', {
      barcode_box: barcode,
      username:    SESSION.username,
    });

    // Simpan id_box yang diterima dari server
    siIdBox = res.data.id_box;

    // Tampilkan info box aktif
    setTxt('si-box-info', barcode + ' → ID: ' + siIdBox);
    showFlex('si-box-active');
    setTxt('si-hint', 'Scan bag sekarang');

    // Update flowchart ke langkah bag
    siSetFlow('bag');

    // Tampilkan notifikasi sukses
    flashOk('si-ok', 'si-ok-msg', 'Box aktif: ' + siIdBox + ' — scan bag sekarang');

    // Kosongkan input & fokus untuk scan berikutnya
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();

  } catch (err) {
    showErr('si-err', err.message); // tampilkan error dari server
  } finally {
    hide('si-loading'); // sembunyikan loading
  }
}

/**
 * Proses scan bag:
 * 1. Validasi: harus ada box aktif dulu
 * 2. Validasi format barcode: 0211 + 9 digit
 * 3. Cek duplikat dalam sesi ini
 * 4. Kirim ke server → dapat lotcode, qty, size, nilai
 * 5. Tambahkan ke tabel dengan id_box aktif
 */
async function siProcessBag(barcode) {

  // Cek: apakah sudah ada box aktif?
  if (!siIdBox) {
    showErr('si-err', 'Scan box dulu sebelum scan bag');
    return;
  }

  // Validasi format barcode bag: harus awali 0211 dan total 13 digit
  if (!/^0211\d{9}$/.test(barcode)) {
    showErr('si-err', 'Format bag tidak valid (awali 0211, 13 digit)');
    return;
  }

  // Cek duplikat: apakah barcode ini sudah discan di sesi ini?
  if (siData.find(d => d.barcode === barcode)) {
    showErr('si-err', 'Barcode bag ini sudah discan');
    return;
  }

  show('si-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/scan-in/bag', {
      barcode_bag: barcode,
      username:    SESSION.username,
    });

    // Tambahkan ke array data tabel
    siData.push({
      barcode: barcode,          // barcode bag
      lotcode: res.data.lotcode, // dari server
      qty:     res.data.qty,     // jumlah PO (dari server)
      size:    res.data.size,    // ukuran sepatu (dari server)
      nilai:   res.data.nilai,   // isi bag dalam pairs (dari server)
      id_box:  siIdBox,          // box yang sedang aktif
    });

    // Render ulang tabel
    siRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('si-ok', 'si-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · QTY:' + res.data.qty +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' pairs'
    );

    // Animasi flowchart: tampilkan 'done' sebentar lalu kembali ke 'bag'
    siSetFlow('done');
    setTimeout(() => siSetFlow('bag'), 1500);

    // Kosongkan input & fokus untuk scan berikutnya
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();

  } catch (err) {
    showErr('si-err', err.message); // tampilkan error dari server
  } finally {
    hide('si-loading'); // sembunyikan loading
  }
}

/**
 * Hapus baris dari tabel Scan In
 * @param {number} i - index baris yang dihapus
 */
function siDeleteRow(i) {
  siData.splice(i, 1); // hapus dari array
  siRenderTable();      // render ulang tabel
}

/** Render ulang tabel DATA SCAN IN dari array siData */
function siRenderTable() {
  const tbody = document.getElementById('si-tbody');
  const tot   = document.getElementById('si-total');

  // Jika tidak ada data, tampilkan baris kosong
  if (!siData.length) {
    tbody.innerHTML   = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  // Hitung total pairs dari semua baris
  let totalPairs = 0;

  // Render setiap baris tabel
  tbody.innerHTML = siData.map((d, i) => {
    totalPairs += d.nilai; // akumulasi pairs
    return `<tr>
      <td class="mono">${d.barcode}</td>
      <td>${d.lotcode}</td>
      <td class="tc">${d.qty}</td>
      <td class="tc">${d.size}</td>
      <td class="tc">${d.nilai} pairs</td>
      <td class="mono">${d.id_box}</td>
      <td><button class="del-btn" onclick="siDeleteRow(${i})">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button></td>
    </tr>`;
  }).join('');

  // Update baris total
  setTxt('si-total-bag',   siData.length);
  setTxt('si-total-pairs', totalPairs + ' pairs');
  tot.style.display = 'flex'; // tampilkan baris total
}


/* ============================================================
   8. SCAN OUT
   
   Input wajib:
   ● Line     → dropdown Line 1–25
   ● Lot Code → input teks bebas
   ● Barcode  → format 0211 + 9 digit

   Data ke server:
   POST /scan-out → { lotcode, barcode_bag, line, username }

   Response dari server:
   { lotcode, qty, size, nilai }
   ============================================================ */

let soData = []; // menyimpan semua baris tabel Scan Out

/** Inisialisasi halaman Scan Out — reset semua state */
function soInit() {
  soData = []; // kosongkan data tabel

  // Kosongkan semua input
  document.getElementById('so-barcode').value = '';
  document.getElementById('so-lotcode').value = '';
  document.getElementById('so-line').value    = '';

  // Sembunyikan semua notifikasi error
  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');

  // Render tabel kosong
  soRenderTable();
}

/**
 * Proses scan out:
 * 1. Validasi semua input wajib
 * 2. Cek duplikat barcode
 * 3. Kirim ke server
 * 4. Tambahkan ke tabel
 */
async function soScan() {
  const line    = val('so-line');    // line produksi yang dipilih
  const lotcode = val('so-lotcode'); // lotcode yang diinput
  const barcode = val('so-barcode'); // barcode bag

  let valid = true; // flag validasi

  // Reset semua pesan error
  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');

  // Validasi: Line wajib dipilih
  if (!line) {
    showErr('so-line-err', 'Line wajib dipilih');
    valid = false;
  }

  // Validasi: Lotcode wajib diisi
  if (!lotcode) {
    showErr('so-lot-err', 'Lot code wajib diisi');
    valid = false;
  }

  // Validasi: format barcode bag harus 0211 + 9 digit
  if (!barcode || !/^0211\d{9}$/.test(barcode)) {
    showErr('so-bc-err', 'Format tidak valid (awali 0211, 13 digit)');
    valid = false;
  }

  // Hentikan jika ada validasi yang gagal
  if (!valid) return;

  // Cek duplikat: barcode tidak boleh discan dua kali
  if (soData.find(d => d.barcode === barcode)) {
    showErr('so-bc-err', 'Barcode ini sudah discan');
    return;
  }

  show('so-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/scan-out', {
      lotcode:     lotcode,
      barcode_bag: barcode,
      line:        line,
      username:    SESSION.username,
    });

    // Tambahkan ke array data tabel
    soData.push({
      barcode: barcode,
      lotcode: res.data.lotcode, // lotcode dari server (konfirmasi)
      qty:     res.data.qty,     // QTY PO dari server
      size:    res.data.size,    // ukuran sepatu dari server
      nilai:   res.data.nilai,   // isi bag dalam pairs dari server
      line:    line,             // line yang dipilih operator
    });

    // Render ulang tabel
    soRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('so-ok', 'so-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' pairs · ' + line
    );

    // Hanya reset barcode (line & lotcode tetap untuk scan berikutnya)
    document.getElementById('so-barcode').value = '';
    document.getElementById('so-barcode').focus();

  } catch (err) {
    showErr('so-bc-err', err.message); // tampilkan error dari server
  } finally {
    hide('so-loading'); // sembunyikan loading
  }
}

/**
 * Hapus baris dari tabel Scan Out
 * @param {number} i - index baris yang dihapus
 */
function soDelete(i) {
  soData.splice(i, 1); // hapus dari array
  soRenderTable();      // render ulang tabel
}

/** Render ulang tabel DATA BON OUT dari array soData */
function soRenderTable() {
  const tbody = document.getElementById('so-tbody');
  const tot   = document.getElementById('so-total');

  // Jika tidak ada data, tampilkan baris kosong
  if (!soData.length) {
    tbody.innerHTML   = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  // Hitung total pairs
  let totalPairs = 0;

  // Render setiap baris tabel
  tbody.innerHTML = soData.map((d, i) => {
    totalPairs += d.nilai;
    return `<tr>
      <td class="mono">${d.barcode}</td>
      <td>${d.lotcode}</td>
      <td class="tc">${d.qty}</td>
      <td class="tc">${d.size}</td>
      <td class="tc">${d.nilai} pairs</td>
      <td>${d.line}</td>
      <td><button class="del-btn" onclick="soDelete(${i})">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button></td>
    </tr>`;
  }).join('');

  // Update baris total
  setTxt('so-total-bag',   soData.length);
  setTxt('so-total-pairs', totalPairs + ' pairs');
  tot.style.display = 'flex';
}


/* ============================================================
   9. LOCATION
   
   3 sub-halaman:
   ① Denah Rak  — grid semua rak + status kapasitas
   ② Isi Rak    — daftar palet dalam rak yang dipilih
   ③ Isi Palet  — scan box untuk membuat palet baru

   Kapasitas per rak: 16 palet

   Data ke server:
   ● Scan box ke palet : POST /location/scan-box → { barcode_box, kode_rak, username }
   ● Simpan palet      : POST /location/palet    → { kode_rak, username, boxes: [...] }

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
 * - Load data rak dari server
 */
async function locInit() {
  locSetPg(1);       // tampilkan sub-halaman denah
  show('loc-loading'); // tampilkan loading

  try {
    // Ambil daftar semua rak + jumlah palet dari server
    const res = await apiRequest('GET', '/location/rak?username=' + SESSION.username);
    locRenderGrid(res.data); // render grid denah
  } catch (err) {
    console.error('Gagal load denah:', err.message);
  } finally {
    hide('loc-loading');
  }
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
    const res = await apiRequest('GET', '/location/rak/' + id + '?username=' + SESSION.username);
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
    const res = await apiRequest('POST', '/location/scan-box', {
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
    const res = await apiRequest('POST', '/location/palet', {
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
   10. REPORT

   Menampilkan ringkasan transaksi hari ini per Line + Lotcode
   Kolom: Line | Lotcode | QTY | Input (pairs) | Output (pairs)

   Fitur:
   ● Filter per Line (dropdown)
   ● Pencarian Lotcode (search input)
   ● Baris total di tfoot tabel
   ● Ekspor tabel sebagai gambar PNG
   ============================================================ */

let rptData = []; // menyimpan data laporan dari server

/** Inisialisasi halaman Report: load data dari server */
async function rptInit() {

  // Tampilkan tanggal hari ini dalam format Indonesia
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  setTxt('rpt-date', now.toLocaleDateString('id-ID', opts));

  // Reset filter
  document.getElementById('rpt-search').value = '';
  const rptLineEl = document.getElementById('rpt-line');
  if (rptLineEl) rptLineEl.value = '';

  try {
    // Ambil data laporan dari server
    const res = await apiRequest('GET', '/report/today?username=' + SESSION.username);
    rptData   = res.data;

    // Hitung stat cards
    const totalIn  = rptData.reduce((a, d) => a + d.input,  0); // total pairs masuk
    const totalOut = rptData.reduce((a, d) => a + d.output, 0); // total pairs keluar
    const cntIn    = rptData.filter(d => d.input  > 0).length;  // jumlah baris yang ada input
    const cntOut   = rptData.filter(d => d.output > 0).length;  // jumlah baris yang ada output

    // Update stat cards
    setTxt('rpt-in-val',  totalIn  + ' pairs');
    setTxt('rpt-in-sub',  cntIn    + ' baris');
    setTxt('rpt-out-val', totalOut + ' pairs');
    setTxt('rpt-out-sub', cntOut   + ' baris');

    rptRender(); // render tabel

  } catch (err) {
    console.error('Gagal load report:', err.message);
  }
}

/**
 * Render tabel laporan dengan filter yang aktif
 * Dipanggil saat: load awal, ketik di search, ganti dropdown Line
 */
function rptRender() {
  // Ambil nilai filter
  const q       = (document.getElementById('rpt-search').value || '').toLowerCase();
  const selLine = document.getElementById('rpt-line')?.value || '';

  // Filter data berdasarkan pencarian & pilihan line
  const rows = rptData.filter(d => {
    const matchQ    = !q || d.lotcode.toLowerCase().includes(q) || (d.line || '').toLowerCase().includes(q);
    const matchLine = !selLine || d.line === selLine;
    return matchQ && matchLine;
  });

  const tbody = document.getElementById('rpt-tbody');
  const tfoot = document.getElementById('rpt-tfoot');

  // Jika tidak ada data setelah filter
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--t4);font-size:12px">Tidak ada data</td></tr>';
    tfoot.innerHTML = '';
    setTxt('rpt-showing', '0');
    setTxt('rpt-net',     '0 pairs');
    return;
  }

  // Render baris data
  tbody.innerHTML = rows.map(d => `
    <tr>
      <td>${d.line || '—'}</td>
      <td class="lot-main">${d.lotcode}</td>
      <td class="qty-val">${d.qty.toLocaleString('id-ID')}</td>
      <td class="in-val">${d.input}</td>
      <td class="out-val">${d.output}</td>
    </tr>`).join('');

  // Hitung total semua baris yang tampil
  const tIn  = rows.reduce((a, d) => a + d.input,  0);
  const tOut = rows.reduce((a, d) => a + d.output, 0);
  const net  = tIn - tOut; // sisa stok = input - output

  // Render baris total di tfoot
  tfoot.innerHTML = `
    <tr style="background:#f9fafb">
      <td colspan="2" style="padding:7px 8px;font-size:10px;font-weight:500;color:#9ca3af">TOTAL</td>
      <td class="qty-val" style="padding:7px 8px">—</td>
      <td class="in-val"  style="padding:7px 8px">${tIn}</td>
      <td class="out-val" style="padding:7px 8px">${tOut}</td>
    </tr>`;

  // Update footer info
  setTxt('rpt-showing', rows.length);
  setTxt('rpt-net',     net + ' pairs');
}

/**
 * Ekspor tabel laporan sebagai gambar PNG
 *
 * Cara kerja:
 * 1. Load library html2canvas dari CDN (jika belum ada)
 * 2. Capture elemen card tabel sebagai canvas
 * 3. Convert canvas ke PNG dan trigger download
 *
 * Nama file: laporan-YYYYMMDD.png
 */
function rptExport() {
  // Cek apakah html2canvas sudah tersedia
  if (!window.html2canvas) {
    // Load library dari CDN secara on-demand
    const script  = document.createElement('script');
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => _doExport(); // jalankan export setelah library siap
    document.head.appendChild(script);
  } else {
    _doExport(); // langsung jalankan jika library sudah ada
  }
}

/** Jalankan proses capture dan download gambar */
function _doExport() {
  const card = document.getElementById('rpt-card'); // element yang akan di-capture
  const btn  = card?.querySelector('.btn-export');  // tombol export (akan disembunyikan saat capture)

  // Sembunyikan tombol agar tidak ikut tercapture dalam gambar
  if (btn) btn.style.display = 'none';

  // Buat nama file dengan tanggal hari ini
  const now   = new Date();
  const fname = 'laporan-' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '.png';

  // Capture element sebagai canvas
  html2canvas(card, {
    backgroundColor: '#ffffff', // latar putih
    scale:           2,          // resolusi 2x untuk ketajaman
    useCORS:         true,       // izinkan resource cross-origin
  }).then(canvas => {
    if (btn) btn.style.display = ''; // tampilkan kembali tombol

    // Buat link download dan klik otomatis
    const link      = document.createElement('a');
    link.download   = fname;
    link.href       = canvas.toDataURL('image/png'); // convert canvas ke data URL
    link.click();                                     // trigger download

  }).catch(err => {
    if (btn) btn.style.display = ''; // tampilkan kembali tombol
    console.error('Export gagal:', err);
    alert('Export gagal: ' + err.message);
  });
}
