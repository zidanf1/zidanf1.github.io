// =====================================================
// SERVICE WORKER (mode offline)
// Cara kerja: saat ada internet, file diambil dari server dan disalin ke cache.
// Saat tidak ada internet, file diambil dari cache.
// Daftar file ada di js/config.js (KONFIG.FILE_CACHE).
// Versi cache mengikuti KONFIG.VERSI: naikkan angkanya di config.js setiap ada pembaruan.
// =====================================================

importScripts('js/config.js');

var NAMA_CACHE = 'warehouse-' + KONFIG.VERSI;

// Pertama kali dipasang: simpan semua file ke cache
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(NAMA_CACHE)
      .then(function (cache) { return cache.addAll(KONFIG.FILE_CACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Versi baru aktif: hapus cache versi lama
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (daftar) {
        return Promise.all(daftar.filter(function (nama) { return nama !== NAMA_CACHE; })
                                 .map(function (nama) { return caches.delete(nama); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Setiap file yang diminta: coba internet dulu, jika gagal pakai cache
self.addEventListener('fetch', function (event) {
  var alamat = new URL(event.request.url);

  // Hanya file aplikasi sendiri yang diurus di sini. Permintaan ke situs lain (misalnya
  // JSONBin) dibiarkan ditangani browser, supaya galatnya tampil apa adanya.
  if (event.request.method !== 'GET' || alamat.origin !== location.origin) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(function (respon) {
        if (respon && respon.ok) {
          var salinan = respon.clone();
          caches.open(NAMA_CACHE).then(function (cache) { cache.put(event.request, salinan); });
        }
        return respon;
      })
      .catch(function () {
        return caches.match(event.request, { ignoreSearch: true })
          .then(function (hit) { return hit || caches.match('./index.html'); });
      })
  );
});
