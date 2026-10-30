// =====================================================
// POPUP FORM DATA RAK
// Muncul saat baris tabel diketuk (ubah) atau tombol "+ Baris" (baru).
// Perubahan baru disimpan saat tombol Simpan ditekan.
// Lotcode baru bisa ditambahkan langsung di sini (panel "Lotcode baru"),
// jadi tidak perlu pindah ke halaman Form Lotcode.
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

// Menggambar daftar lotcode di popup.
// Kotak "Cari lotcode" mencari di semua isian lotcode: lotcode, model, style, qty, dan tanggal pindah.
function gambarDaftarLotEdit() {
  var kataCari = pecahKata(el('inputCariLot').value);
  var html = '<button class="item' + (POPUP.lot === '' ? ' aktif' : '') + '" onclick="pilihLotEdit(-1)">— Kosong (tanpa lotcode) —</button>';

  var jumlahCocok = 0;
  for (var i = 0; i < DATA.lot.length; i++) {
    var lot = DATA.lot[i];
    if (kataCari.length > 0 && !cocokLot(lot, kataCari)) {
      continue;
    }
    jumlahCocok++;
    html += '<button class="item' + (lot.lot === POPUP.lot ? ' aktif' : '') + '" onclick="pilihLotEdit(' + i + ')">' +
            '<b>' + aman(lot.lot) + '</b>' +
            '<span class="muted item-info">' + aman(teksInfoLot(lot)) + '<br>' + aman(teksPindah(lot)) + '</span></button>';
  }

  // Tidak ditemukan: tawarkan menambah lotcode baru di popup ini
  if (jumlahCocok === 0) {
    var kata = el('inputCariLot').value.trim().toUpperCase();
    var pesan = (kata !== '') ? 'Lotcode \"<b>' + aman(kata) + '</b>\" tidak ditemukan.' : 'Belum ada lotcode.';
    html += '<div class="tidak-ada"><div>' + pesan + '</div>' +
            '<button class="btn utama" onclick="bukaFormLotBaru()">+ Lotcode baru</button></div>';
  }
  el('daftarPilihLot').innerHTML = html;
}

// ----- Panel "Lotcode baru" di dalam popup -----

// Membuka panel. Jika kotak cari berisi satu kata, kata itu dipakai sebagai lotcode.
function bukaFormLotBaru() {
  var kata = el('inputCariLot').value.trim().toUpperCase();
  var panel = el('panelLotBaru');
  panel.style.display = 'flex';

  if (el('popLot').value === '' && kata !== '' && kata.indexOf(' ') === -1) {
    el('popLot').value = kata;
  }
  panel.scrollIntoView({ block: 'nearest' });
  el(el('popLot').value === '' ? 'popLot' : 'popModel').focus();
}

function tutupFormLotBaru() {
  el('panelLotBaru').style.display = 'none';
  kosongkanForm(FORM_LOT.popup);
}

// Tombol "+ Lotcode baru" di atas daftar: buka atau tutup panel
function bukaTutupFormLotBaru() {
  if (el('panelLotBaru').style.display === 'none') {
    bukaFormLotBaru();
  } else {
    tutupFormLotBaru();
  }
}

// Tombol "Simpan lotcode" di panel: simpan lotcode lalu langsung dipilih untuk baris rak ini
function simpanLotDariPopup() {
  var lot = simpanDariForm(FORM_LOT.popup);
  if (lot === '') {
    return;
  }
  POPUP.lot = lot;
  el('inputCariLot').value = '';
  tutupFormLotBaru();
  tampilkanSemua();          // daftar saran, daftar di Form Lotcode, dan tabel ikut diperbarui
  gambarDaftarLotEdit();

  var aktif = el('daftarPilihLot').querySelector('.aktif');
  if (aktif) {
    aktif.scrollIntoView({ block: 'nearest' });
  }
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
  tutupFormLotBaru();
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
  var berpindah = false;   // true jika lotcode ini baru ditempatkan atau pindah lokasi

  if (POPUP.baru) {
    berpindah = (POPUP.lot !== '');
    DATA.rak.push({ loc: lokasi, lot: POPUP.lot });
    nomorTampil = DATA.rak.length - 1;
    kosongkanPencarian();   // supaya baris baru pasti terlihat
  } else {
    var lama = DATA.rak[POPUP.nomor];
    berpindah = (POPUP.lot !== '' && (lama.loc !== lokasi || lama.lot !== POPUP.lot));
    lama.loc = lokasi;
    lama.lot = POPUP.lot;
  }

  if (berpindah) {
    catatPindah(POPUP.lot);                          // timestamp "terakhir pindah" pada lotcode
    simpanData(KONFIG.KUNCI.lot, DATA.lot);
  }
  simpanRak();
  tutupEdit();
  tampilkanSemua();

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
