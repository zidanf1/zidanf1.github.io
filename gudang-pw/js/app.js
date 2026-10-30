// =====================================================
// MULAI APLIKASI
// File ini dimuat paling akhir. Urutan di sini = urutan aplikasi menyala.
// =====================================================

// Menggambar ulang daftar lotcode dan tabel stok
function tampilkanSemua() {
  isiDaftarSaran();
  tampilkanDaftarLot();
  tampilkanTabel();
}

// Mendaftarkan service worker (agar aplikasi bisa dibuka tanpa internet)
function daftarkanServiceWorker() {
  if (!KONFIG.PAKAI_SERVICE_WORKER || !('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {
      // gagal (misalnya dibuka dari file lokal): aplikasi tetap jalan seperti biasa
    });
  });
}

function mulaiAplikasi() {
  // 1. Siapkan data
  muatData();
  rapikanData();

  // 2. Siapkan isi pilihan
  buatPilihanTema();

  // 3. Tampilkan
  pasangTema(bacaData(KONFIG.KUNCI.tema, KONFIG.TEMA_BAWAAN));
  tampilkanWaktu();
  tampilkanSemua();
  bukaHalaman(location.hash.slice(1) || bacaData(KONFIG.KUNCI.halaman, 'stok'));

  // 4. Pasang pendengar kejadian
  document.addEventListener('click', tutupMenu);                // klik di mana saja menutup menu
  window.addEventListener('hashchange', function () {           // tombol Kembali di HP
    bukaHalaman(location.hash.slice(1));
  });

  // 5. Sinkronisasi JSONBin (hanya berjalan jika sudah diatur)
  mulaiSinkron();

  // 6. Mode offline
  daftarkanServiceWorker();
}

mulaiAplikasi();
