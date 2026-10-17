// =====================================================
// SINKRONISASI DATA (JSONBin)
// Menyimpan salinan data di JSONBin supaya bisa dipakai bersama di beberapa HP.
//
// Cara kerja singkat:
//  - Data tetap disimpan di HP (localStorage), JSONBin hanya salinan bersama.
//  - Manual : tombol "Ambil dari JSONBin" dan "Kirim ke JSONBin".
//  - Otomatis: saat data berubah, dikirim ke JSONBin. Saat aplikasi dibuka,
//    data yang LEBIH BARU yang dipakai (lihat sinkronOtomatis).
//
// PENTING: Bin ID dan kunci API TIDAK ditulis di kode ini. Keduanya diisi lewat
// menu "Sinkronisasi" dan hanya disimpan di HP masing-masing.
// =====================================================

var SYNC = {
  pengaturan: { binId: '', kunci: '', jenis: 'X-Access-Key', otomatis: false, sudahAwal: false },
  sedangJalan: false,    // true saat ada proses sinkron yang berjalan
  ulang: false,          // true jika ada permintaan sinkron saat proses lain berjalan
  timer: null,           // pengatur jeda kirim otomatis
  berhasilTerakhir: 0    // waktu (ms) sinkron terakhir yang berhasil
};

var JENIS_KUNCI = ['X-Access-Key', 'X-Master-Key'];

// ----- Pengaturan -----

function muatPengaturanSinkron() {
  var simpan = bacaData(KONFIG.KUNCI.sync, null);
  if (!simpan) {
    return;
  }
  SYNC.pengaturan.binId = String(simpan.binId || '');
  SYNC.pengaturan.kunci = String(simpan.kunci || '');
  SYNC.pengaturan.jenis = (JENIS_KUNCI.indexOf(simpan.jenis) !== -1) ? simpan.jenis : 'X-Access-Key';
  SYNC.pengaturan.otomatis = (simpan.otomatis === true);
  SYNC.pengaturan.sudahAwal = (simpan.sudahAwal === true);
}

function simpanPengaturanSinkronKeBrowser() {
  simpanData(KONFIG.KUNCI.sync, SYNC.pengaturan);
}

// Sudah ada Bin ID dan kunci?
function sinkronTerhubung() {
  return SYNC.pengaturan.binId !== '' && SYNC.pengaturan.kunci !== '';
}

// Sinkron otomatis boleh jalan? (sudah terhubung, otomatis dinyalakan, dan sinkron pertama sudah dipilih)
function sinkronAktif() {
  return sinkronTerhubung() && SYNC.pengaturan.otomatis && SYNC.pengaturan.sudahAwal;
}

// ----- Status (di popup dan di bawah bar atas) -----

function jamSekarang() {
  var sekarang = new Date();
  return dua(sekarang.getHours()) + ':' + dua(sekarang.getMinutes());
}

var statusPesan = '';
var statusGalat = false;

function aturStatusSinkron(pesan, galat) {
  statusPesan = pesan;
  statusGalat = (galat === true);
  tampilkanStatusSinkron();
}

function tampilkanStatusSinkron() {
  var warna = statusGalat ? 'var(--red)' : '';

  // Titik status di tombol awan (bar atas)
  var titik = 'titik';
  if (sinkronTerhubung()) {
    if (statusGalat) {
      titik = 'titik err';
    } else if (SYNC.sedangJalan || statusPesan.indexOf('Menunggu') === 0) {
      titik = 'titik proses';
    } else {
      titik = 'titik ok';
    }
  }
  el('titikSinkron').className = titik;
  el('tombolSinkron').title = 'Sinkronisasi' + (statusPesan !== '' ? ': ' + statusPesan : '');

  el('sinkronStatus').textContent = statusPesan;
  el('sinkronStatus').style.color = warna;

  var baris = el('statusSinkron');
  if (!sinkronTerhubung()) {
    baris.style.display = 'none';
    return;
  }
  baris.style.display = 'block';
  baris.textContent = 'Sinkron: ' + (statusPesan !== '' ? statusPesan : (sinkronAktif() ? 'aktif' : 'manual'));
  baris.style.color = warna;
}

// ----- Bicara dengan JSONBin -----

function pesanGalatJsonbin(kodeStatus) {
  if (kodeStatus === 401 || kodeStatus === 403) {
    return 'Ditolak JSONBin: kunci salah, kunci tidak punya izin Read/Update, atau jatah request habis.';
  }
  if (kodeStatus === 404) {
    return 'Bin ID tidak ditemukan.';
  }
  if (kodeStatus === 429) {
    return 'Terlalu banyak request ke JSONBin. Coba lagi nanti.';
  }
  return 'JSONBin menolak permintaan (kode ' + kodeStatus + ').';
}

// metode: 'GET' (baca) atau 'PUT' (ganti isi bin). p = pengaturan (Bin ID dan kunci).
async function panggilJsonbin(metode, isi, p) {
  var url = KONFIG.JSONBIN.URL + '/b/' + encodeURIComponent(p.binId) + (metode === 'GET' ? '/latest' : '');
  var header = {};
  header[p.jenis] = p.kunci;
  var opsi = { method: metode, headers: header, cache: 'no-store' };

  if (metode === 'GET') {
    header['X-Bin-Meta'] = 'false';          // minta isinya saja, tanpa metadata
  } else {
    header['Content-Type'] = 'application/json';
    opsi.body = JSON.stringify(isi);
  }

  var respon;
  try {
    respon = await fetch(url, opsi);
  } catch (error) {
    throw new Error('Tidak bisa terhubung ke JSONBin. Periksa koneksi internet.');
  }
  if (!respon.ok) {
    throw new Error(pesanGalatJsonbin(respon.status));
  }
  try {
    return await respon.json();
  } catch (error) {
    throw new Error('Balasan JSONBin tidak bisa dibaca.');
  }
}

// ----- Data yang dikirim / diterima -----

// Membaca isi bin. Hasilnya null jika bin belum berisi data aplikasi ini.
async function bacaRemote(p) {
  var json = await panggilJsonbin('GET', null, p);
  var isi = (json && json.record && !Array.isArray(json.lots)) ? json.record : json;
  if (!isi || !Array.isArray(isi.lots) || !Array.isArray(isi.rows)) {
    return null;
  }
  return bersihkanDataLuar(isi);
}

// Mengirim data HP ke JSONBin (menimpa isi bin)
async function kirimLokal(p) {
  if (!DATA.waktuUpdate) {
    // belum pernah ada perubahan: beri waktu supaya bisa dibandingkan
    DATA.waktuUpdate = new Date().toISOString();
    simpanData(KONFIG.KUNCI.waktu, DATA.waktuUpdate);
    tampilkanWaktu();
  }
  var paket = buatPaket();
  if (JSON.stringify(paket).length > KONFIG.JSONBIN.BATAS_BYTE) {
    throw new Error('Data terlalu besar untuk paket gratis JSONBin (batas 100 KB).');
  }
  await panggilJsonbin('PUT', paket, p);
}

// Memakai data dari JSONBin di HP ini (menimpa data HP)
function terapkanRemote(data) {
  terapkanData(data);
}

function lokalKosong() {
  return DATA.lot.length === 0 && DATA.rak.length === 0;
}

function waktuMs(teks) {
  if (!teks) {
    return 0;
  }
  return new Date(teks).getTime();
}

// ----- Menjalankan proses dengan penjaga -----

// Membungkus satu proses sinkron: hanya satu proses pada satu waktu, galat ditampilkan.
async function jalankanSinkron(tugas) {
  if (SYNC.sedangJalan) {
    aturStatusSinkron('Masih memproses, coba lagi sebentar lagi.', true);
    return false;
  }
  SYNC.sedangJalan = true;
  try {
    await tugas();
    SYNC.berhasilTerakhir = Date.now();
    return true;
  } catch (error) {
    aturStatusSinkron('Gagal: ' + error.message, true);
    return false;
  } finally {
    SYNC.sedangJalan = false;
    tampilkanStatusSinkron();   // perbarui titik status setelah proses selesai
    if (SYNC.ulang) {
      SYNC.ulang = false;
      jadwalkanSinkron();
    }
  }
}

// ----- Sinkron otomatis -----

// Dipanggil setiap data berubah (lihat catatWaktuUpdate di data.js)
function jadwalkanSinkron() {
  if (!sinkronAktif()) {
    return;
  }
  aturStatusSinkron('Menunggu untuk dikirim...', false);
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(sinkronOtomatis, KONFIG.JSONBIN.TUNDA_MS);
}

// Aturannya: data yang LEBIH BARU menang.
//  - JSONBin kosong                 -> kirim data HP
//  - JSONBin lebih baru dari HP     -> pakai data JSONBin
//  - HP lebih baru dari JSONBin     -> kirim data HP
async function sinkronOtomatis() {
  if (!sinkronAktif()) {
    return;
  }
  if (SYNC.sedangJalan) {
    SYNC.ulang = true;
    return;
  }
  await jalankanSinkron(async function () {
    aturStatusSinkron('Menyinkronkan...', false);
    var p = SYNC.pengaturan;
    var remote = await bacaRemote(p);

    if (remote === null || (remote.lots.length === 0 && remote.rows.length === 0 && !lokalKosong())) {
      await kirimLokal(p);
    } else if (waktuMs(remote.updated) > waktuMs(DATA.waktuUpdate)) {
      terapkanRemote(remote);
    } else if (waktuMs(DATA.waktuUpdate) > waktuMs(remote.updated)) {
      await kirimLokal(p);
    }
    aturStatusSinkron('Tersinkron ' + jamSekarang(), false);
  });
}

// Sinkron pertama kali (dipilih sekali saat sinkron otomatis dinyalakan)
async function sinkronAwal() {
  var p = SYNC.pengaturan;
  var remote = await bacaRemote(p);
  var lokal = { lots: DATA.lot, rows: DATA.rak, updated: DATA.waktuUpdate };
  var pesan = '';

  if (remote === null || (remote.lots.length === 0 && remote.rows.length === 0)) {
    await kirimLokal(p);
    pesan = 'Data HP dikirim ke JSONBin.';
  } else if (lokalKosong()) {
    terapkanRemote(remote);
    pesan = 'Data dari JSONBin dipakai di HP ini.';
  } else if (remote.updated && remote.updated === DATA.waktuUpdate) {
    pesan = 'Data sudah sama.';
  } else {
    var pakaiRemote = window.confirm(
      'Data di JSONBin dan di HP ini berbeda.\n\n' +
      'JSONBin: ' + ringkasan(remote) + '\n' +
      'HP ini: ' + ringkasan(lokal) + '\n\n' +
      'OK = pakai data JSONBin (data HP diganti)\n' +
      'Batal = pakai data HP (data JSONBin diganti)'
    );
    if (pakaiRemote) {
      terapkanRemote(remote);
      pesan = 'Data dari JSONBin dipakai di HP ini.';
    } else {
      await kirimLokal(p);
      pesan = 'Data HP dikirim ke JSONBin.';
    }
  }
  SYNC.pengaturan.sudahAwal = true;
  simpanPengaturanSinkronKeBrowser();
  aturStatusSinkron(pesan + ' Tersinkron ' + jamSekarang(), false);
}

// ----- Popup Sinkronisasi -----

function bukaSinkron() {
  var p = SYNC.pengaturan;
  el('sinkronBin').value = p.binId;
  el('sinkronKunci').value = p.kunci;
  el('sinkronJenis').value = p.jenis;
  el('sinkronOtomatis').checked = p.otomatis;
  tampilkanStatusSinkron();
  el('kotakSinkron').style.display = 'flex';
}

function tutupSinkron() {
  el('kotakSinkron').style.display = 'none';
}

// Membaca isi formulir sinkronisasi
function bacaFormSinkron() {
  return {
    binId: el('sinkronBin').value.trim(),
    kunci: el('sinkronKunci').value.trim(),
    jenis: el('sinkronJenis').value,
    otomatis: el('sinkronOtomatis').checked
  };
}

// Memeriksa Bin ID dan kunci sudah diisi
function formSinkronLengkap(p) {
  if (p.binId === '' || p.kunci === '') {
    aturStatusSinkron('Isi Bin ID dan kunci API dulu.', true);
    return false;
  }
  return true;
}

// Menyimpan Bin ID dan kunci dari formulir sebagai pengaturan aktif
function pakaiFormSebagaiPengaturan(p, sudahAwal) {
  var berubah = (p.binId !== SYNC.pengaturan.binId || p.kunci !== SYNC.pengaturan.kunci || p.jenis !== SYNC.pengaturan.jenis);
  SYNC.pengaturan = {
    binId: p.binId,
    kunci: p.kunci,
    jenis: p.jenis,
    otomatis: p.otomatis,
    sudahAwal: sudahAwal || (berubah ? false : SYNC.pengaturan.sudahAwal)
  };
  simpanPengaturanSinkronKeBrowser();
}

// Tombol "Simpan"
async function simpanPengaturanSinkron() {
  var p = bacaFormSinkron();
  if (!formSinkronLengkap(p)) {
    return;
  }
  pakaiFormSebagaiPengaturan(p, false);

  if (!SYNC.pengaturan.otomatis) {
    aturStatusSinkron('Pengaturan tersimpan. Pakai tombol Ambil / Kirim untuk sinkron manual.', false);
    return;
  }
  if (!SYNC.pengaturan.sudahAwal) {
    await jalankanSinkron(sinkronAwal);
    return;
  }
  aturStatusSinkron('Pengaturan tersimpan.', false);
  sinkronOtomatis();
}

// Tombol "Tes koneksi"
async function tesKoneksiSinkron() {
  var p = bacaFormSinkron();
  if (!formSinkronLengkap(p)) {
    return;
  }
  await jalankanSinkron(async function () {
    aturStatusSinkron('Menghubungi JSONBin...', false);
    var remote = await bacaRemote(p);
    if (remote === null) {
      aturStatusSinkron('Terhubung. Bin masih kosong / belum berisi data Warehouse.', false);
    } else {
      aturStatusSinkron('Terhubung. Bin berisi ' + ringkasan(remote) + '.', false);
    }
  });
}

// Tombol "Ambil dari JSONBin": data HP diganti data JSONBin
async function ambilManualSinkron() {
  var p = bacaFormSinkron();
  if (!formSinkronLengkap(p)) {
    return;
  }
  await jalankanSinkron(async function () {
    aturStatusSinkron('Mengambil data...', false);
    var remote = await bacaRemote(p);
    if (remote === null) {
      aturStatusSinkron('Bin masih kosong, tidak ada yang diambil.', true);
      return;
    }
    if (!window.confirm('Ganti data di HP ini dengan data JSONBin?\n\nJSONBin: ' + ringkasan(remote) + '\n\nData di HP ini akan hilang.')) {
      aturStatusSinkron('Dibatalkan.', false);
      return;
    }
    terapkanRemote(remote);
    pakaiFormSebagaiPengaturan(p, true);
    aturStatusSinkron('Data diambil dari JSONBin ' + jamSekarang(), false);
  });
}

// Tombol "Kirim ke JSONBin": data JSONBin diganti data HP
async function kirimManualSinkron() {
  var p = bacaFormSinkron();
  if (!formSinkronLengkap(p)) {
    return;
  }
  await jalankanSinkron(async function () {
    if (!window.confirm('Ganti data di JSONBin dengan data HP ini?\n\nData lama di JSONBin akan tertimpa.')) {
      aturStatusSinkron('Dibatalkan.', false);
      return;
    }
    aturStatusSinkron('Mengirim data...', false);
    await kirimLokal(p);
    pakaiFormSebagaiPengaturan(p, true);
    aturStatusSinkron('Data dikirim ke JSONBin ' + jamSekarang(), false);
  });
}

// Tombol "Putuskan": hapus Bin ID dan kunci dari HP ini (data tidak dihapus)
function putuskanSinkron() {
  if (!window.confirm('Putuskan sinkronisasi?\n\nBin ID dan kunci dihapus dari HP ini. Data di HP dan di JSONBin tidak dihapus.')) {
    return;
  }
  clearTimeout(SYNC.timer);
  SYNC.pengaturan = { binId: '', kunci: '', jenis: 'X-Access-Key', otomatis: false, sudahAwal: false };
  simpanPengaturanSinkronKeBrowser();
  bukaSinkron();
  aturStatusSinkron('Sinkronisasi diputuskan.', false);
}

// ----- Dipanggil saat aplikasi dimulai -----

function mulaiSinkron() {
  muatPengaturanSinkron();
  tampilkanStatusSinkron();

  // Saat internet kembali, atau aplikasi dibuka lagi setelah lama, sinkron ulang
  window.addEventListener('online', sinkronOtomatis);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - SYNC.berhasilTerakhir > 60000) {
      sinkronOtomatis();
    }
  });

  sinkronOtomatis();   // tidak melakukan apa-apa jika sinkron otomatis belum aktif
}
