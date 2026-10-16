// =====================================================
// POPUP FORM DATA RAK
// Muncul saat baris tabel diketuk (ubah) atau tombol "+ Baris" (baru).
// Perubahan baru disimpan saat tombol Simpan ditekan.
// =====================================================

// Data sementara selama popup terbuka
var POPUP = {
  nomor: -1,      // nomor baris yang diubah (di DATA.rak)
  baru: false,    // true jika dibuka dari tombol "+ Baris"
  lot: ''         // lotcode yang sedang dipilih di popup
};

// ----- Isi popup -----

// Isi pilihan IDRak: Floor dulu, lalu A1-1 ... B10-8
function buatOpsiLokasi(terpilih) {
  var daftar = [KONFIG.LABEL_FLOOR].concat(KONFIG.LOKASI);
  var html = '';
  for (var i = 0; i < daftar.length; i++) {
    var pilih = (daftar[i] === terpilih) ? ' selected' : '';
    html += '<option' + pilih + '>' + daftar[i] + '</option>';
  }
  return html;
}

// Mengetuk satu lotcode di daftar. nomor -1 = kosongkan lotcode.
function pilihLotEdit(nomor) {
  if (nomor < 0) {
    POPUP.lot = '';
  } else {
    POPUP.lot = DATA.lot[nomor].lot;
  }
  gambarDaftarLotEdit();
}

// Menggambar daftar lotcode di popup (bisa dicari lewat kotak "Cari lotcode")
function gambarDaftarLotEdit() {
  var kata = el('inputCariLot').value.trim().toUpperCase();
  var html = '<button class="item' + (POPUP.lot === '' ? ' aktif' : '') + '" onclick="pilihLotEdit(-1)">— Kosong (tanpa lotcode) —</button>';

  var jumlahCocok = 0;
  for (var i = 0; i < DATA.lot.length; i++) {
    var lot = DATA.lot[i];
    if (kata !== '' && lot.lot.indexOf(kata) === -1) {
      continue;
    }
    jumlahCocok++;
    html += '<button class="item' + (lot.lot === POPUP.lot ? ' aktif' : '') + '" onclick="pilihLotEdit(' + i + ')">' +
            '<b>' + aman(lot.lot) + '</b><span class="muted">' + aman(lot.tipe ? lot.tipe : '-') + ' · Qty ' + aman(lot.qty) + '</span></button>';
  }

  // Lotcode tidak ditemukan: arahkan ke Form Lotcode
  if (jumlahCocok === 0) {
    var pesan = (kata !== '') ? 'Lotcode "<b>' + aman(kata) + '</b>" tidak ditemukan.' : 'Belum ada lotcode.';
    html += '<div class="tidak-ada"><div>' + pesan + '</div>' +
            '<button class="btn utama" onclick="bukaFormLotcode()">Buka Form Lotcode</button></div>';
  }
  el('daftarPilihLot').innerHTML = html;
}

// ----- Buka / tutup -----

// Membuka popup. nomor = baris yang diubah, atau -1 untuk baris baru.
function bukaEdit(nomor) {
  POPUP.nomor = nomor;
  POPUP.baru = (nomor < 0);

  var lokasi = 'A1-1';
  var lot = '';
  if (!POPUP.baru) {
    lokasi = DATA.rak[nomor].loc;
    lot = DATA.rak[nomor].lot;
  }
  POPUP.lot = lot;

  el('judulEdit').textContent = POPUP.baru ? 'Form Data Rak · Baru' : 'Form Data Rak';
  el('pilihLokasi').innerHTML = buatOpsiLokasi(lokasi);
  el('inputCariLot').value = '';
  gambarDaftarLotEdit();
  el('tombolHapusEdit').style.display = POPUP.baru ? 'none' : 'block';
  el('kotakEdit').style.display = 'flex';

  // Gulung daftar supaya lotcode yang terpilih terlihat
  var aktif = el('daftarPilihLot').querySelector('.aktif');
  if (aktif) {
    aktif.scrollIntoView({ block: 'nearest' });
  }
}

function tutupEdit() {
  el('kotakEdit').style.display = 'none';
}

// ----- Tombol di popup -----

// Tombol Simpan
function simpanEdit() {
  var lokasi = el('pilihLokasi').value;
  var nomorTampil = POPUP.nomor;

  if (POPUP.baru) {
    DATA.rak.push({ loc: lokasi, lot: POPUP.lot });
    nomorTampil = DATA.rak.length - 1;
    kosongkanPencarian();   // supaya baris baru pasti terlihat
  } else {
    DATA.rak[POPUP.nomor].loc = lokasi;
    DATA.rak[POPUP.nomor].lot = POPUP.lot;
  }

  simpanRak();
  tutupEdit();
  tampilkanTabel();

  var baris = el('r' + nomorTampil);
  if (baris) {
    baris.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Tombol Hapus
function hapusDariEdit() {
  hapusBaris(POPUP.nomor);
  tutupEdit();
}

// Tombol "+ Baris" di halaman Stok Rak
function tambahBaris() {
  bukaEdit(-1);
}

function hapusBaris(nomor) {
  DATA.rak.splice(nomor, 1);
  simpanRak();
  tampilkanTabel();
}

// ----- Lotcode tidak ditemukan: ke Form Lotcode lalu kembali -----

// Dari popup ke halaman Form Lotcode (untuk menambah lotcode baru)
function bukaFormLotcode() {
  var kata = el('inputCariLot').value.trim().toUpperCase();

  // Ingat baris dan IDRak yang sedang diisi, supaya bisa kembali setelah lotcode disimpan
  UI.tujuanKembali = { nomor: POPUP.nomor, lokasi: el('pilihLokasi').value };

  tutupEdit();
  pindahHalaman('form');
  el('inputLot').value = kata;
  el('pesan').textContent = 'Lotcode belum ada. Isi type dan qty, lalu Simpan. Anda akan kembali ke Form Data Rak.';
}

// Dipanggil setelah lotcode baru disimpan di Form Lotcode (lihat lot-form.js):
// kembali ke Stok Rak, buka popup lagi, dan pilih lotcode yang baru.
function kembaliKePopup(lotBaru) {
  var tujuan = UI.tujuanKembali;
  UI.tujuanKembali = null;

  pindahHalaman('stok');
  bukaEdit(tujuan.nomor);
  el('pilihLokasi').value = tujuan.lokasi;
  POPUP.lot = lotBaru;
  gambarDaftarLotEdit();
}
