// =====================================================
// HALAMAN STOK RAK
// Tabel stok, kolom pencarian, dan pilihan urutan.
// =====================================================

// ----- Pencarian -----

// Dipanggil saat isi kolom pencarian berubah
function ubahPencarian() {
  UI.teksCari = el('inputCari').value;
  tampilkanTabel();
}

// Mengosongkan kolom pencarian (tanpa menggambar ulang tabel)
function kosongkanPencarian() {
  UI.teksCari = '';
  el('inputCari').value = '';
}

// Memecah teks pencarian menjadi daftar kata (huruf besar). "j05 b1" -> ['J05', 'B1']
function ambilKataCari() {
  var kata = [];
  var potongan = UI.teksCari.trim().toUpperCase().split(' ');
  for (var i = 0; i < potongan.length; i++) {
    if (potongan[i] !== '') {
      kata.push(potongan[i]);
    }
  }
  return kata;
}

// Apakah semua kata pencarian ditemukan di teks baris ini?
function cocokPencarian(teksBaris, kataCari) {
  var teks = teksBaris.toUpperCase();
  for (var i = 0; i < kataCari.length; i++) {
    if (teks.indexOf(kataCari[i]) === -1) {
      return false;
    }
  }
  return true;
}

// ----- Urutan -----

// Mengisi select urutan dan memilih yang sedang aktif
function tampilkanPilihanUrut() {
  var aktif = UI.urutKunci + ':' + (UI.urutNaik ? 'naik' : 'turun');
  var html = '';
  for (var i = 0; i < KONFIG.PILIHAN_URUT.length; i++) {
    var pilihan = KONFIG.PILIHAN_URUT[i];
    var terpilih = (pilihan.nilai === aktif) ? ' selected' : '';
    html += '<option value="' + pilihan.nilai + '"' + terpilih + '>' + pilihan.teks + '</option>';
  }
  el('pilihUrut').innerHTML = html;
}

// Dipanggil saat pilihan urutan diganti
function ubahUrut() {
  var bagian = el('pilihUrut').value.split(':');   // 'lot:naik' -> ['lot', 'naik']
  UI.urutKunci = bagian[0];
  UI.urutNaik = (bagian[1] === 'naik');
  simpanData(KONFIG.KUNCI.urut, { kunci: UI.urutKunci, naik: UI.urutNaik });
  tampilkanTabel();
}

// Membandingkan dua baris (a dan b = nomor baris di DATA.rak).
// Hasil negatif: a lebih dulu. Positif: b lebih dulu.
function bandingkanBaris(a, b) {
  var rakA = DATA.rak[a];
  var rakB = DATA.rak[b];
  var lotA = cariLot(rakA.lot);
  var lotB = cariLot(rakB.lot);
  var arah = UI.urutNaik ? 1 : -1;
  var selisihLokasi = nomorLokasi(rakA.loc) - nomorLokasi(rakB.loc);

  // Urut IDRak: A1-1, A1-2, ... lalu Floor di akhir
  if (UI.urutKunci === 'idrak') {
    return selisihLokasi * arah;
  }

  // Urut model / qty / lotcode: baris kosong (tanpa lotcode) selalu di paling bawah
  if (!lotA && !lotB) return selisihLokasi;
  if (!lotA) return 1;
  if (!lotB) return -1;

  var hasil = 0;
  if (UI.urutKunci === 'model') {
    if (lotA.tipe === '' && lotB.tipe !== '') return 1;    // lot tanpa model juga di bawah
    if (lotB.tipe === '' && lotA.tipe !== '') return -1;
    hasil = lotA.tipe.localeCompare(lotB.tipe);
  }
  if (UI.urutKunci === 'qty') {
    hasil = lotA.qty - lotB.qty;
  }
  if (UI.urutKunci === 'lot') {
    hasil = lotA.lot.localeCompare(lotB.lot, undefined, { numeric: true });
  }

  if (hasil !== 0) {
    return hasil * arah;
  }
  return selisihLokasi;   // jika nilainya sama, urutkan menurut IDRak
}

// Kelompok baris untuk garis pemisah:
// per deret (A1, A2, ...) saat urut IDRak, per lotcode saat urut Lotcode, selain itu tanpa kelompok.
function tentukanKelompok(rak, namaLot) {
  if (UI.urutKunci === 'idrak') {
    return rak.loc.split('-')[0];
  }
  if (UI.urutKunci === 'lot') {
    return namaLot;
  }
  return '';
}

// ----- Menggambar tabel -----

// Menggambar ulang tabel stok rak
function tampilkanTabel() {
  tampilkanPilihanUrut();

  var kataCari = ambilKataCari();

  // Daftar nomor baris, diurutkan sesuai pilihan urutan yang aktif
  var urutan = [];
  for (var n = 0; n < DATA.rak.length; n++) {
    urutan.push(n);
  }
  urutan.sort(bandingkanBaris);

  var html = '';
  var urutanTampil = 0;            // untuk warna belang
  var kelompokSebelumnya = '';     // untuk garis pemisah antar kelompok

  for (var u = 0; u < urutan.length; u++) {
    var i = urutan[u];             // nomor baris asli di DATA.rak
    var rak = DATA.rak[i];
    var lot = cariLot(rak.lot);    // null jika baris ini kosong

    // Isi kolom (baris kosong tampil "-")
    var model = '-';
    var namaLot = 'kosong';
    var qty = '-';
    if (lot) {
      model = lot.tipe ? lot.tipe : '-';
      namaLot = lot.lot;
      qty = lot.qty;
    }

    // Terapkan pencarian
    if (kataCari.length > 0 && !cocokPencarian(rak.loc + ' ' + model + ' ' + namaLot + ' ' + qty, kataCari)) {
      continue;
    }

    urutanTampil++;
    var warna = 'z' + (urutanTampil % 2);

    // Garis pemisah jika kelompok berganti
    var kelompok = tentukanKelompok(rak, namaLot);
    var garis = '';
    if (kelompok !== '' && kelompokSebelumnya !== '' && kelompok !== kelompokSebelumnya) {
      garis = ' garis';
    }
    kelompokSebelumnya = kelompok;

    var teksLot = lot ? aman(lot.lot) : '<span class="kosong">● kosong</span>';

    html += '<tr class="data ' + warna + garis + '" id="r' + i + '" onclick="bukaEdit(' + i + ')">';
    html += '<td><b>' + aman(rak.loc) + '</b></td>';
    html += '<td>' + aman(model) + '</td>';
    html += '<td>' + teksLot + '</td>';
    html += '<td>' + aman(qty) + '</td>';
    html += '</tr>';
  }

  // Tidak ada baris yang ditampilkan
  if (html === '') {
    var pesan = (DATA.rak.length === 0) ? 'Belum ada baris. Ketuk + Baris untuk menambah.' : 'Tidak ada data yang cocok.';
    html = '<tr><td colspan="4" class="muted" style="padding:16px">' + pesan + '</td></tr>';
  }

  el('isiTabel').innerHTML = html;
}
