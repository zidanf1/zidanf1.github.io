// =====================================================
// DATA APLIKASI
// DATA = isi data yang disimpan.   UI = keadaan tampilan sementara.
// =====================================================

// ----- Data yang disimpan di browser -----
var DATA = {
  lot: [],            // daftar lotcode.  Isi: { lot: 'ABC', qty: 10, tipe: 'GS', style: 'X1', pindah: '2026-10-30T07:00:00Z' }
                      // tipe = Model. pindah = waktu lokasi lotcode terakhir berubah (ditempatkan / pindah / keluar dari rak)
  rak: [],            // daftar baris rak. Isi: { loc: 'A1-1', lot: 'ABC' }
  waktuUpdate: null   // waktu perubahan data terakhir (teks ISO)
};

// ----- Keadaan tampilan (tidak semuanya disimpan) -----
var UI = {
  urutKunci: KONFIG.URUT_BAWAAN.kunci,   // 'lot', 'idrak', 'model', atau 'qty'
  urutNaik: KONFIG.URUT_BAWAAN.naik,     // true = A-Z / terkecil
  teksCari: '',                          // kata di kolom pencarian
  temaAktif: KONFIG.TEMA[KONFIG.TEMA_BAWAAN]
};

// Membaca semua data dari localStorage
function muatData() {
  DATA.lot = bacaData(KONFIG.KUNCI.lot, []);
  DATA.rak = bacaData(KONFIG.KUNCI.rak, []);
  DATA.waktuUpdate = bacaData(KONFIG.KUNCI.waktu, null);

  var urutSimpan = bacaData(KONFIG.KUNCI.urut, null);
  if (urutSimpan && urutSimpan.kunci) {
    UI.urutKunci = urutSimpan.kunci;
    UI.urutNaik = urutSimpan.naik;
  }
}

// Merapikan data lama supaya sesuai aturan terbaru
function rapikanData() {
  for (var i = 0; i < DATA.lot.length; i++) {
    var lot = DATA.lot[i];
    lot.lot = String(lot.lot).toUpperCase();         // lotcode selalu huruf besar
    lot.tipe = String(lot.tipe || '').trim();        // Model boleh teks bebas
    lot.style = String(lot.style || '').trim();      // data lama belum punya style
    lot.pindah = formatWaktuPendek(lot.pindah) ? lot.pindah : '';   // data lama belum punya waktu pindah
  }

  for (var j = 0; j < DATA.rak.length; j++) {
    var rak = DATA.rak[j];
    rak.lot = String(rak.lot || '').toUpperCase();
    if (!rak.loc) {
      rak.loc = 'A1-1';
    }
    if (KONFIG.NAMA_LAMA_FLOOR.indexOf(rak.loc) !== -1) {
      rak.loc = KONFIG.LABEL_FLOOR;                  // nama lama diganti nama Floor yang sekarang
    }
  }
}

// Mencari lot berdasarkan namanya. Hasilnya null jika tidak ada.
function cariLot(namaLot) {
  for (var i = 0; i < DATA.lot.length; i++) {
    if (DATA.lot[i].lot === namaLot) {
      return DATA.lot[i];
    }
  }
  return null;
}

// Peta lokasi semua lotcode saat ini: { 'J07T184': 'A7-3', 'J08X001': 'A1-1, B2-4' }.
// Lotcode yang tidak ada di baris rak mana pun tidak masuk peta (= tidak di rak).
function petaLokasiLot() {
  var peta = {};
  for (var i = 0; i < DATA.rak.length; i++) {
    var nama = DATA.rak[i].lot;
    if (nama === '') {
      continue;
    }
    peta[nama] = (peta[nama] ? peta[nama] + ', ' : '') + DATA.rak[i].loc;
  }
  return peta;
}

// Membandingkan lokasi lotcode sebelum dan sesudah sebuah perubahan (sebelum = hasil petaLokasiLot()
// yang diambil sebelum perubahan). Lotcode yang lokasinya berubah (ditempatkan, pindah, atau keluar
// dari rak) diberi waktu sekarang di field "pindah". Pemanggil yang menyimpan DATA.lot.
function catatPerubahanLokasi(sebelum) {
  var sesudah = petaLokasiLot();
  var sekarang = new Date().toISOString();
  for (var i = 0; i < DATA.lot.length; i++) {
    var nama = DATA.lot[i].lot;
    if ((sebelum[nama] || '') !== (sesudah[nama] || '')) {
      DATA.lot[i].pindah = sekarang;
    }
  }
}

// ----- Menyimpan (sekaligus mencatat waktu update) -----

function simpanLot() {
  simpanData(KONFIG.KUNCI.lot, DATA.lot);
  catatWaktuUpdate();
}

function simpanRak() {
  simpanData(KONFIG.KUNCI.rak, DATA.rak);
  catatWaktuUpdate();
}

function catatWaktuUpdate() {
  DATA.waktuUpdate = new Date().toISOString();
  simpanData(KONFIG.KUNCI.waktu, DATA.waktuUpdate);
  tampilkanWaktu();
  jadwalkanSinkron();   // kirim ke JSONBin jika sinkron otomatis aktif (js/sync.js)
}

// ----- Data yang dibagikan: paket, pembersih, penerapan -----

// Bentuk paket data (dipakai JSONBin dan file cadangan): { app, versi, updated, lots: [...], rows: [...] }
function buatPaket() {
  return {
    app: KONFIG.NAMA_APP,
    versi: 1,
    updated: DATA.waktuUpdate,
    lots: DATA.lot,
    rows: DATA.rak
  };
}

// Data dari luar (JSONBin atau file cadangan) tidak dipercaya begitu saja.
// Di sini semua isinya diperiksa dan dibersihkan sebelum dipakai.
// hasil.dibuang = jumlah data yang tidak valid dan dibuang.
function bersihkanDataLuar(r) {
  var hasil = { lots: [], rows: [], updated: null, dibuang: 0 };
  var daftarLokasi = KONFIG.LOKASI.concat([KONFIG.LABEL_FLOOR]);

  for (var i = 0; i < r.lots.length; i++) {
    var l = r.lots[i];
    if (!l || typeof l !== 'object' || String(l.lot || '').trim() === '') {
      hasil.dibuang++;
      continue;
    }
    var tipe = String(l.tipe || '').trim().slice(0, KONFIG.PANJANG_ISIAN);
    var style = String(l.style || '').trim().slice(0, KONFIG.PANJANG_ISIAN);
    var pindah = formatWaktuPendek(l.pindah) ? new Date(l.pindah).toISOString() : '';
    hasil.lots.push({ lot: String(l.lot).trim().toUpperCase(), qty: Number(l.qty) || 0, tipe: tipe, style: style, pindah: pindah });
  }

  for (var j = 0; j < r.rows.length; j++) {
    var b = r.rows[j];
    if (!b || typeof b !== 'object' || daftarLokasi.indexOf(b.loc) === -1) {
      hasil.dibuang++;
      continue;    // lokasi di luar daftar dibuang
    }
    hasil.rows.push({ loc: b.loc, lot: String(b.lot || '').toUpperCase() });
  }

  if (r.updated) {
    var tanggal = new Date(r.updated);
    if (!isNaN(tanggal.getTime())) {
      hasil.updated = tanggal.toISOString();
    }
  }
  return hasil;
}


// Memakai sebuah paket data (yang sudah dibersihkan) di HP ini: menimpa data HP
function terapkanData(data) {
  DATA.lot = data.lots;
  DATA.rak = data.rows;
  DATA.waktuUpdate = data.updated;
  simpanData(KONFIG.KUNCI.lot, DATA.lot);
  simpanData(KONFIG.KUNCI.rak, DATA.rak);
  simpanData(KONFIG.KUNCI.waktu, DATA.waktuUpdate);
  tampilkanWaktu();
  tampilkanSemua();
}

// Ringkasan paket data untuk ditampilkan, contoh: "3 lotcode, 5 baris, update Sabtu, 03/10/2026  14:02"
function ringkasan(data) {
  var teks = data.lots.length + ' lotcode, ' + data.rows.length + ' baris';
  if (data.updated) {
    teks += ', update ' + formatWaktu(new Date(data.updated));
  }
  return teks;
}
