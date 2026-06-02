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
const API_BASE = 'https://blackcat2003.infinityfree.me/';

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
    const res = await apiRequest('POST', '/config/login.php', { username, password });

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
 * - Hapus data session & sessionStorage
 * - Redirect ke halaman login
 */
function doLogout() {
  SESSION = { token: null, username: null, role: null };
  sessionStorage.removeItem('sms_session');
  window.location.replace('login.html');
}


/* ============================================================
   12. SESSION GUARD
   Cek sesi dari sessionStorage saat halaman dimuat.
   Jika tidak ada sesi, redirect ke login.html.
   ============================================================ */

(function () {
  const stored = sessionStorage.getItem('sms_session');
  if (!stored) {
    window.location.replace('login.html');
    return;
  }
  const sess = JSON.parse(stored);
  SESSION.token    = sess.token;
  SESSION.username = sess.username;
  SESSION.role     = sess.role;

  document.getElementById('dash-username').textContent = SESSION.username;
  document.getElementById('dash-role').textContent     = SESSION.role;
  initDropdowns();
  goPage('dashboard');
})();
