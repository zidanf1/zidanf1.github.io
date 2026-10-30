// =====================================================
// FORM LOTCODE
// Dipakai di dua tempat dengan isian yang sama:
//   1. halaman Form Lotcode (menu)
//   2. panel "Lotcode baru" di dalam popup Form Data Rak (rack-popup.js)
// Isian Model dan Style adalah input teks dengan saran otomatis (autofill).
// =====================================================

// Id elemen untuk tiap form
var FORM_LOT = {
  halaman: { lot: 'inputLot', model: 'inputModel', style: 'inputStyle', qty: 'inputQty', pesan: 'pesan' },
  popup:   { lot: 'popLot',   model: 'popModel',   style: 'popStyle',   qty: 'popQty',   pesan: 'popPesan' }
};

// ----- Saran autofill untuk Model dan Style -----

// Mengumpulkan nilai unik (tanpa membedakan besar/kecil huruf):
// nilai bawaan dari config + nilai yang sudah dipakai di data lotcode.
// kunci = 'tipe' (Model) atau 'style'.
function kumpulkanSaran(bawaan, kunci) {
  var sumber = bawaan.slice();
  for (var i = 0; i < DATA.lot.length; i++) {
    sumber.push(DATA.lot[i][kunci]);
  }

  var daftar = [];
  var sudah = {};
  for (var j = 0; j < sumber.length; j++) {
    var nilai = String(sumber[j] || '').trim();
    var kunciUnik = nilai.toUpperCase();
    if (nilai === '' || sudah[kunciUnik]) {
      continue;
    }
    sudah[kunciUnik] = true;
    daftar.push(nilai);
  }
  daftar.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  return daftar;
}

// Mengisi daftar saran (datalist) di kedua form
function isiDaftarSaran() {
  var model = kumpulkanSaran(KONFIG.TIPE, 'tipe');
  var style = kumpulkanSaran([], 'style');
  var htmlModel = '';
  var htmlStyle = '';
  for (var i = 0; i < model.length; i++) {
    htmlModel += '<option value="' + aman(model[i]) + '"></option>';
  }
  for (var j = 0; j < style.length; j++) {
    htmlStyle += '<option value="' + aman(style[j]) + '"></option>';
  }
  el('daftarModel').innerHTML = htmlModel;
  el('daftarStyle').innerHTML = htmlStyle;
}

// Jika nilai yang diketik sama dengan saran (beda besar/kecil huruf saja), pakai tulisan saran itu
function samakanHuruf(nilai, daftar) {
  for (var i = 0; i < daftar.length; i++) {
    if (daftar[i].toUpperCase() === nilai.toUpperCase()) {
      return daftar[i];
    }
  }
  return nilai;
}

// Merapikan isian teks: spasi di ujung dibuang, spasi ganda jadi satu, dibatasi panjangnya
function rapikanIsian(teks) {
  return String(teks).replace(/\s+/g, ' ').trim().slice(0, KONFIG.PANJANG_ISIAN);
}

// ----- Teks untuk ditampilkan -----

// Contoh: "GS · X1 · Qty 5343"  (style dilewati jika kosong)
function teksInfoLot(lot) {
  var teks = lot.tipe ? lot.tipe : '-';
  if (lot.style) {
    teks += ' · ' + lot.style;
  }
  return teks + ' · Qty ' + lot.qty;
}

// Status lokasi + sejak kapan. peta = hasil petaLokasiLot() (diambil sekali per penggambaran daftar).
// Contoh: "A7-3 · 1 hari lalu",  "Tidak di rak · 3 hari lalu",  "Tidak di rak · waktu belum tercatat"
function teksPindah(lot, peta) {
  var lokasi = peta[lot.lot] ? peta[lot.lot] : 'Tidak di rak';
  var lalu = waktuLalu(lot.pindah);
  return lokasi + ' · ' + (lalu !== '' ? lalu : 'waktu belum tercatat');
}

// Apakah lotcode ini cocok dengan semua kata pencarian?
// Yang dicari: lotcode, model, style, qty, lokasi / "tidak di rak", dan tanggal pindah.
function cocokLot(lot, kataCari, peta) {
  var teks = lot.lot + ' ' + lot.tipe + ' ' + lot.style + ' ' + lot.qty + ' ' +
             (peta[lot.lot] ? peta[lot.lot] : 'tidak di rak') + ' ' + formatWaktuPendek(lot.pindah);
  return cocokPencarian(teks, kataCari);
}

// ----- Isian form (dipakai kedua form) -----

// Mengosongkan semua isian sebuah form
function kosongkanForm(f) {
  el(f.lot).value = '';
  el(f.model).value = '';
  el(f.style).value = '';
  el(f.qty).value = '';
  el(f.pesan).textContent = '';
}

// Membaca isian, memeriksa, lalu menyimpan lotcode (baru, atau memperbarui yang sudah ada).
// Hasilnya nama lotcode, atau '' jika isian belum lengkap.
function simpanDariForm(f) {
  var lot = el(f.lot).value.trim().toUpperCase();
  var model = rapikanIsian(el(f.model).value);
  var style = rapikanIsian(el(f.style).value);
  var qtyTeks = el(f.qty).value;
  var qty = Number(qtyTeks);

  if (lot === '' || model === '' || qtyTeks === '' || qty < 0) {
    el(f.pesan).textContent = 'Isi lotcode, model, dan qty. (Style boleh kosong.)';
    return '';
  }

  model = samakanHuruf(model, kumpulkanSaran(KONFIG.TIPE, 'tipe'));
  style = samakanHuruf(style, kumpulkanSaran([], 'style'));

  var sudahAda = cariLot(lot);
  if (sudahAda) {
    // Lotcode sudah ada: perbarui model, style, dan qty (waktu pindah tidak berubah)
    sudahAda.qty = qty;
    sudahAda.tipe = model;
    sudahAda.style = style;
  } else {
    // Lotcode baru: belum di rak, dihitung sejak dibuat
    DATA.lot.push({ lot: lot, qty: qty, tipe: model, style: style, pindah: new Date().toISOString() });
  }
  simpanLot();
  kosongkanForm(f);
  return lot;
}

// ----- Halaman Form Lotcode -----

// Menampilkan daftar lotcode yang sudah disimpan
function tampilkanDaftarLot() {
  if (DATA.lot.length === 0) {
    el('isiDaftarLot').innerHTML = '<tr><td colspan="2" class="muted">Belum ada lotcode</td></tr>';
    return;
  }

  var peta = petaLokasiLot();
  var html = '';
  for (var i = 0; i < DATA.lot.length; i++) {
    var lot = DATA.lot[i];
    // Kiri (ketuk untuk mengubah): lotcode, lalu model / style / qty, lalu lokasi dan sejak kapan. Kanan: tombol Hapus.
    html += '<tr>';
    html += '<td class="bisa-ketuk" onclick="isiFormDariLot(' + i + ')"><b>' + aman(lot.lot) + '</b>' +
            '<div class="muted">' + aman(teksInfoLot(lot)) + '</div>' +
            '<div class="muted">' + aman(teksPindah(lot, peta)) + '</div></td>';
    html += '<td><button class="btn merah" onclick="hapusLot(' + i + ')">Hapus</button></td>';
    html += '</tr>';
  }
  el('isiDaftarLot').innerHTML = html;
}

// Mengetuk satu lotcode di daftar: isiannya dipindah ke form supaya mudah diubah
function isiFormDariLot(nomor) {
  var lot = DATA.lot[nomor];
  el('inputLot').value = lot.lot;
  el('inputModel').value = lot.tipe;
  el('inputStyle').value = lot.style;
  el('inputQty').value = lot.qty;
  el('pesan').textContent = 'Mengubah ' + lot.lot + '. Tekan Simpan setelah selesai.';
  window.scrollTo(0, 0);
}

// Tombol Simpan di halaman Form Lotcode
function simpanLotcode() {
  var lot = simpanDariForm(FORM_LOT.halaman);
  if (lot === '') {
    return;
  }
  el('pesan').textContent = 'Tersimpan.';
  tampilkanSemua();
}

// Tombol Hapus di daftar lotcode
function hapusLot(nomor) {
  var nama = DATA.lot[nomor].lot;
  DATA.lot.splice(nomor, 1);

  // Baris rak yang memakai lot ini jadi kosong
  for (var i = 0; i < DATA.rak.length; i++) {
    if (DATA.rak[i].lot === nama) {
      DATA.rak[i].lot = '';
    }
  }
  simpanData(KONFIG.KUNCI.rak, DATA.rak);
  simpanLot();
  tampilkanSemua();
}
