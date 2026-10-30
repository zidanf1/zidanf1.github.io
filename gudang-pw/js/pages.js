// =====================================================
// HALAMAN, MENU, DAN WAKTU UPDATE
// Aplikasi punya dua halaman: 'stok' (Stok Rak) dan 'form' (Form Lotcode).
// =====================================================

// Menampilkan satu halaman dan menyembunyikan yang lain
function bukaHalaman(nama) {
  if (nama !== 'form') {
    nama = 'stok';
  }
  el('halamanForm').style.display = (nama === 'form') ? 'block' : 'none';
  el('halamanStok').style.display = (nama === 'stok') ? 'block' : 'none';
  el('judulHalaman').textContent = (nama === 'form') ? 'Form Lotcode' : 'Stok Rak';
  el('menuStok').className = (nama === 'stok') ? 'menu-item aktif' : 'menu-item';
  el('menuForm').className = (nama === 'form') ? 'menu-item aktif' : 'menu-item';
  simpanData(KONFIG.KUNCI.halaman, nama);
  window.scrollTo(0, 0);
}

// Pindah halaman dan mencatatnya di alamat (supaya tombol Kembali di HP berfungsi)
function pindahHalaman(nama) {
  bukaHalaman(nama);
  try {
    location.hash = nama;
  } catch (error) {
    // abaikan
  }
}

// Pindah halaman lewat menu
function bukaHalamanMenu(nama) {
  pindahHalaman(nama);
}

// ----- Menu dropdown di bar atas -----

function bukaTutupMenu(event) {
  event.stopPropagation();   // supaya klik ini tidak langsung menutup menu
  var menu = el('menu');
  menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
}

function tutupMenu() {
  el('menu').style.display = 'none';
}

// ----- Waktu update di bawah bar atas -----

function tampilkanWaktu() {
  var teks = '-';
  if (DATA.waktuUpdate) {
    teks = formatWaktu(new Date(DATA.waktuUpdate));
  }
  el('teksUpdate').textContent = 'Update: ' + teks;
}
