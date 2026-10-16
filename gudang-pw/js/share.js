// =====================================================
// BAGIKAN: teks WhatsApp dan gambar Screenshot
// Data yang dibagikan hanya baris yang terisi lotcode,
// diurutkan menurut lotcode (lalu IDRak).
// =====================================================

// ----- Data yang dibagikan -----

function dataUntukBagikan() {
  var hasil = [];
  for (var i = 0; i < DATA.rak.length; i++) {
    var lot = cariLot(DATA.rak[i].lot);
    if (lot) {
      hasil.push({ loc: DATA.rak[i].loc, lot: lot.lot, tipe: lot.tipe ? lot.tipe : '-', qty: lot.qty });
    }
  }
  hasil.sort(function (a, b) {
    var banding = a.lot.localeCompare(b.lot, undefined, { numeric: true });
    if (banding !== 0) {
      return banding;
    }
    return nomorLokasi(a.loc) - nomorLokasi(b.loc);
  });
  return hasil;
}

// Waktu yang dicantumkan: waktu update terakhir, atau sekarang jika belum ada
function waktuUntukBagikan() {
  if (DATA.waktuUpdate) {
    return new Date(DATA.waktuUpdate);
  }
  return new Date();
}

// ----- WhatsApp -----

// Format:
//   Sabtu, 03/10/2026  14:02
//   ===========================
//   A1-1 . J07T123 Qty 5403
//
//   ===========================
function buatTeksWA() {
  var garis = '===========================';
  var data = dataUntukBagikan();
  var teks = formatWaktu(waktuUntukBagikan()) + '\n' + garis + '\n';
  for (var i = 0; i < data.length; i++) {
    teks += data[i].loc + ' . ' + data[i].lot + ' Qty ' + data[i].qty + '\n';
  }
  teks += '\n' + garis;
  return teks;
}

function kirimWhatsApp() {
  window.open('https://wa.me/?text=' + encodeURIComponent(buatTeksWA()), '_blank');
}

// ----- Screenshot (gambar tabel) -----

// Ukuran dan posisi di dalam gambar (dalam piksel)
var GAMBAR = {
  skala: 2,            // 2 = lebih tajam
  lebar: 400,
  tinggiJudul: 64,
  tinggiHeader: 34,
  tinggiBaris: 30,
  tepi: 14,            // jarak dari tepi kiri/kanan
  kolomModel: 78,      // posisi kolom Model
  kolomLot: 170,       // posisi kolom Lotcode
  huruf: 'Roboto, Arial, sans-serif'
};

var kanvasGambar = null;   // gambar terakhir yang dibuat

// Menggambar bagian judul: nama aplikasi dan waktu update
function gambarJudul(g) {
  g.textAlign = 'left';
  g.fillStyle = '#212529';
  g.font = 'bold 18px ' + GAMBAR.huruf;
  g.fillText(KONFIG.NAMA_APP, GAMBAR.tepi, 22);
  g.fillStyle = '#555555';
  g.font = '13px ' + GAMBAR.huruf;
  g.fillText('Update: ' + formatWaktu(waktuUntukBagikan()), GAMBAR.tepi, 46);
}

// Menggambar header tabel (IDRak, Model, Lotcode, Qty)
function gambarHeader(g) {
  var y = GAMBAR.tinggiJudul;
  var tengah = y + GAMBAR.tinggiHeader / 2;

  g.fillStyle = UI.temaAktif.bar;
  g.fillRect(0, y, GAMBAR.lebar, GAMBAR.tinggiHeader);

  g.fillStyle = '#ffffff';
  g.font = 'bold 13px ' + GAMBAR.huruf;
  g.textAlign = 'left';
  g.fillText('IDRak', GAMBAR.tepi, tengah);
  g.fillText('Model', GAMBAR.kolomModel, tengah);
  g.fillText('Lotcode', GAMBAR.kolomLot, tengah);
  g.textAlign = 'right';
  g.fillText('Qty', GAMBAR.lebar - GAMBAR.tepi, tengah);
}

// Menggambar satu baris data. nomor = urutan baris (untuk warna belang).
function gambarBaris(g, data, nomor) {
  var y = GAMBAR.tinggiJudul + GAMBAR.tinggiHeader + nomor * GAMBAR.tinggiBaris;
  var tengah = y + GAMBAR.tinggiBaris / 2;

  g.fillStyle = (nomor % 2 === 0) ? UI.temaAktif.strip : '#ffffff';
  g.fillRect(0, y, GAMBAR.lebar, GAMBAR.tinggiBaris);

  g.fillStyle = '#212529';
  g.textAlign = 'left';
  g.font = 'bold 13px ' + GAMBAR.huruf;
  g.fillText(data.loc, GAMBAR.tepi, tengah, 60);
  g.font = '13px ' + GAMBAR.huruf;
  g.fillText(data.tipe, GAMBAR.kolomModel, tengah, 88);
  g.fillText(data.lot, GAMBAR.kolomLot, tengah, 170);
  g.textAlign = 'right';
  g.fillText(String(data.qty), GAMBAR.lebar - GAMBAR.tepi, tengah);
}

// Membuat seluruh gambar
function buatGambar() {
  var data = dataUntukBagikan();
  var jumlahBaris = Math.max(data.length, 1);
  var tinggi = GAMBAR.tinggiJudul + GAMBAR.tinggiHeader + jumlahBaris * GAMBAR.tinggiBaris + 14;

  var kanvas = document.createElement('canvas');
  kanvas.width = GAMBAR.lebar * GAMBAR.skala;
  kanvas.height = tinggi * GAMBAR.skala;
  var g = kanvas.getContext('2d');
  g.scale(GAMBAR.skala, GAMBAR.skala);
  g.textBaseline = 'middle';

  // Latar putih
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, GAMBAR.lebar, tinggi);

  gambarJudul(g);
  gambarHeader(g);

  if (data.length === 0) {
    g.fillStyle = '#555555';
    g.font = '13px ' + GAMBAR.huruf;
    g.textAlign = 'left';
    g.fillText('Belum ada data', GAMBAR.tepi, GAMBAR.tinggiJudul + GAMBAR.tinggiHeader + GAMBAR.tinggiBaris / 2);
  }
  for (var i = 0; i < data.length; i++) {
    gambarBaris(g, data[i], i);
  }
  return kanvas;
}

// Menu "Screenshot": buat gambar dan tampilkan pratinjaunya
function tampilkanGambar() {
  kanvasGambar = buatGambar();
  el('gambarHasil').src = kanvasGambar.toDataURL('image/png');
  el('kotakGambar').style.display = 'block';
}

function tutupGambar() {
  el('kotakGambar').style.display = 'none';
}

// Tombol "Simpan / Bagikan": buka menu bagikan HP, atau unduh jika tidak didukung
function simpanGambar() {
  if (!kanvasGambar) {
    return;
  }
  kanvasGambar.toBlob(function (blob) {
    var sekarang = new Date();
    var namaFile = 'warehouse-' + sekarang.getFullYear() + dua(sekarang.getMonth() + 1) + dua(sekarang.getDate()) +
                   '-' + dua(sekarang.getHours()) + dua(sekarang.getMinutes()) + '.png';
    var file = new File([blob], namaFile, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: KONFIG.NAMA_APP }).catch(function () {
        // pengguna membatalkan, tidak apa-apa
      });
      return;
    }

    // Cadangan: unduh sebagai file
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = namaFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, 'image/png');
}
