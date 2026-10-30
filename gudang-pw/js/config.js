// =====================================================
// KONFIGURASI APLIKASI
// Semua pengaturan yang sering diubah ada di file ini.
// CATATAN: file ini juga dibaca oleh sw.js (service worker),
//          jadi jangan memakai "document" atau "window" di sini.
// =====================================================

var KONFIG = {

  NAMA_APP: 'Warehouse',

  // NAIKKAN angka versi ini setiap selesai memperbarui aplikasi,
  // supaya HP/browser mengambil file yang baru (lihat README.md).
  VERSI: '2.3.0',

  // false = service worker (mode offline) dimatikan. Dipakai oleh build.py untuk file mandiri.
  PAKAI_SERVICE_WORKER: true,

  // Kunci penyimpanan di localStorage.
  // JANGAN DIUBAH: kalau diubah, data lama di HP tidak akan terbaca lagi.
  KUNCI: {
    lot:     'gudang_lots',
    rak:     'gudang_rows',
    waktu:   'gudang_upd',
    tema:    'gudang_tema',
    halaman: 'gudang_page',
    urut:    'gudang_urut',
    sync:    'gudang_sync'      // pengaturan JSONBin (Bin ID dan kunci API disimpan di HP ini saja)
  },

  // ----- Pilihan data -----

  // Saran awal untuk isian Model (muncul sebagai autofill di form lotcode).
  // Model boleh diketik bebas; nilai yang pernah dipakai otomatis ikut jadi saran.
  TIPE: ['GS', 'PS', 'TD', 'MEN', 'SOCCER', 'BasketBall'],

  // Batas panjang isian Model dan Style
  PANJANG_ISIAN: 30,

  // Ukuran rak: huruf rak, jumlah baris, jumlah kolom.
  // Contoh hasil: A1-1 ... A10-8, B1-1 ... B10-8
  HURUF_RAK: ['A', 'B'],
  JUMLAH_BARIS: 10,
  JUMLAH_KOLOM: 8,

  // Nama lokasi untuk barang yang belum masuk rak
  LABEL_FLOOR: 'Floor',
  // Nama-nama lama yang otomatis diganti menjadi LABEL_FLOOR pada data tersimpan
  NAMA_LAMA_FLOOR: ['BELUM', 'Off-Field', 'STG'],

  // ----- Tampilan -----

  HARI: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],

  TEMA_BAWAAN: 'Biru',

  // Tema warna. Untuk menambah tema, cukup tambah satu baris di sini.
  //   bar    = bar atas          strip = baris belang
  //   dark   = header tabel      page  = latar halaman
  //   accent = tombol utama
  TEMA: {
    'Biru':     { bar: '#4682b4', strip: '#eaf1f8', dark: '#36648b', page: '#ffffff', accent: '#4682b4' },
    'Maroon':   { bar: '#800000', strip: '#f7ecec', dark: '#5c0000', page: '#ffffff', accent: '#800000' },
    'Hijau':    { bar: '#2e7d32', strip: '#eaf5ea', dark: '#1b5e20', page: '#ffffff', accent: '#2e7d32' },
    'Ungu':     { bar: '#6a4c93', strip: '#f0ebf6', dark: '#4a3468', page: '#ffffff', accent: '#6a4c93' },
    'Oranye':   { bar: '#d9730d', strip: '#fdf1e4', dark: '#a35309', page: '#ffffff', accent: '#d9730d' },
    'Api Biru': { bar: '#1a56db', strip: '#e3f2fd', dark: '#0b3aa8', page: '#ffffff', accent: '#1a56db' },
    'Navy':     { bar: '#1f2c68', strip: '#f4f5fc', dark: '#1b2557', page: '#eef0f8', accent: '#2d55d9' },
    'Abu':      { bar: '#495057', strip: '#f1f3f5', dark: '#343a40', page: '#ffffff', accent: '#495057' }
  },

  // ----- Urutan tabel -----

  // Urutan saat aplikasi pertama kali dibuka: lotcode A-Z (jika sama, menurut IDRak)
  URUT_BAWAAN: { kunci: 'lot', naik: true },

  // Pilihan di select "Urutkan". nilai = kunci:arah
  PILIHAN_URUT: [
    { nilai: 'lot:naik',    teks: 'Lotcode A-Z' },
    { nilai: 'lot:turun',   teks: 'Lotcode Z-A' },
    { nilai: 'idrak:naik',  teks: 'IDRak A-Z' },
    { nilai: 'idrak:turun', teks: 'IDRak Z-A' },
    { nilai: 'model:naik',  teks: 'Model A-Z' },
    { nilai: 'model:turun', teks: 'Model Z-A' },
    { nilai: 'qty:turun',   teks: 'Qty terbesar' },
    { nilai: 'qty:naik',    teks: 'Qty terkecil' }
  ],

  // ----- Sinkronisasi JSONBin (js/sync.js) -----
  JSONBIN: {
    URL: 'https://api.jsonbin.io/v3',
    TUNDA_MS: 2500,          // jeda setelah data berubah sebelum dikirim otomatis
    BATAS_BYTE: 95000        // paket gratis JSONBin: maksimal 100 KB per bin
  },

  // ----- Mode offline -----

  // Daftar file yang disimpan untuk mode offline (dibaca oleh sw.js).
  // Jika menambah file CSS / JS / gambar baru, tambahkan juga di sini.
  FILE_CACHE: [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/fonts.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/table.css',
    './css/modal.css',
    './js/config.js',
    './js/utils.js',
    './js/storage.js',
    './js/data.js',
    './js/pages.js',
    './js/theme.js',
    './js/lot-form.js',
    './js/stock-table.js',
    './js/rack-popup.js',
    './js/share.js',
    './js/sync.js',
    './js/backup.js',
    './js/app.js',
    './fonts/roboto-400.woff2',
    './fonts/roboto-700.woff2',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-512.png',
    './icons/logo-96.png'
  ]
};

// Daftar semua lokasi rak, dibuat otomatis dari pengaturan ukuran rak di atas.
KONFIG.LOKASI = [];
for (var h = 0; h < KONFIG.HURUF_RAK.length; h++) {
  for (var baris = 1; baris <= KONFIG.JUMLAH_BARIS; baris++) {
    for (var kolom = 1; kolom <= KONFIG.JUMLAH_KOLOM; kolom++) {
      KONFIG.LOKASI.push(KONFIG.HURUF_RAK[h] + baris + '-' + kolom);
    }
  }
}
