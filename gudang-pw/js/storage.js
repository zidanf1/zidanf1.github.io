// =====================================================
// PENYIMPANAN DI BROWSER (localStorage)
// Hanya ada dua fungsi di sini. Semua file lain menyimpan
// dan membaca data lewat dua fungsi ini.
// =====================================================

// Membaca data. Jika belum ada (atau rusak), hasilnya nilai "bawaan".
function bacaData(kunci, bawaan) {
  try {
    var teks = localStorage.getItem(kunci);
    if (teks === null) {
      return bawaan;
    }
    return JSON.parse(teks);
  } catch (error) {
    return bawaan;
  }
}

// Menyimpan data.
function simpanData(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (error) {
    // abaikan jika penyimpanan tidak tersedia
  }
}
