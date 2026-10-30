// =====================================================
// FUNGSI BANTU UMUM
// Fungsi kecil yang dipakai di banyak file.
// =====================================================

// Mengambil elemen HTML berdasarkan id
function el(id) {
  return document.getElementById(id);
}

// Mengamankan teks sebelum dimasukkan ke HTML (mencegah karakter < > " merusak tampilan)
function aman(teks) {
  return String(teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Angka satu digit jadi dua digit: 5 -> "05"
function dua(angka) {
  if (angka < 10) {
    return '0' + angka;
  }
  return String(angka);
}

// Contoh hasil: "Sabtu, 03/10/2026  14:02"
function formatWaktu(tanggal) {
  return KONFIG.HARI[tanggal.getDay()] + ', ' +
    dua(tanggal.getDate()) + '/' + dua(tanggal.getMonth() + 1) + '/' + tanggal.getFullYear() +
    '  ' + dua(tanggal.getHours()) + ':' + dua(tanggal.getMinutes());
}

// Contoh hasil: "03/10/2026 14:02" (dari teks ISO). Kosong jika tidak valid.
function formatWaktuPendek(teksIso) {
  if (!teksIso) {
    return '';
  }
  var tanggal = new Date(teksIso);
  if (isNaN(tanggal.getTime())) {
    return '';
  }
  return dua(tanggal.getDate()) + '/' + dua(tanggal.getMonth() + 1) + '/' + tanggal.getFullYear() +
    ' ' + dua(tanggal.getHours()) + ':' + dua(tanggal.getMinutes());
}

// Selisih waktu dalam bahasa sehari-hari: "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu"
function waktuLalu(teksIso) {
  var tanggal = new Date(teksIso);
  if (!teksIso || isNaN(tanggal.getTime())) {
    return '';
  }
  var menit = Math.floor((Date.now() - tanggal.getTime()) / 60000);
  if (menit < 1) {
    return 'baru saja';
  }
  if (menit < 60) {
    return menit + ' menit lalu';
  }
  if (menit < 60 * 24) {
    return Math.floor(menit / 60) + ' jam lalu';
  }
  return Math.floor(menit / (60 * 24)) + ' hari lalu';
}

// Nomor urut lokasi, dipakai untuk mengurutkan. "Floor" selalu paling akhir.
function nomorLokasi(lokasi) {
  if (lokasi === KONFIG.LABEL_FLOOR) {
    return 9999;
  }
  return KONFIG.LOKASI.indexOf(lokasi);
}
