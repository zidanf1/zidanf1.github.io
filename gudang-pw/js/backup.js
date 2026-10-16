// =====================================================
// CADANGAN DATA (Ekspor dan Impor lewat file)
// Ekspor = menyimpan data ke file .json di HP.
// Impor  = memulihkan data dari file .json.
// Berjalan tanpa internet. Cocok sebagai pengaman jika data di browser terhapus.
// =====================================================

var BATAS_FILE_IMPOR = 2 * 1024 * 1024;   // file lebih dari 2 MB ditolak

// ----- Popup -----

function bukaCadangan() {
  aturStatusCadangan('', false);
  el('kotakCadangan').style.display = 'flex';
}

function tutupCadangan() {
  el('kotakCadangan').style.display = 'none';
}

function aturStatusCadangan(pesan, galat) {
  el('cadanganStatus').textContent = pesan;
  el('cadanganStatus').style.color = (galat === true) ? 'var(--red)' : '';
}

// ----- Ekspor -----

// Contoh nama file: warehouse-cadangan-20261003-1402.json
function namaFileCadangan() {
  var sekarang = new Date();
  return 'warehouse-cadangan-' + sekarang.getFullYear() + dua(sekarang.getMonth() + 1) + dua(sekarang.getDate()) +
         '-' + dua(sekarang.getHours()) + dua(sekarang.getMinutes()) + '.json';
}

// Tombol "Ekspor data": unduh data sebagai file
function eksporData() {
  var paket = buatPaket();
  paket.diekspor = new Date().toISOString();

  var blob = new Blob([JSON.stringify(paket, null, 2)], { type: 'application/json' });
  var nama = namaFileCadangan();

  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nama;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 10000);

  aturStatusCadangan('File dibuat: ' + nama + ' (' + DATA.lot.length + ' lotcode, ' + DATA.rak.length + ' baris).', false);
}

// ----- Impor -----

// Tombol "Impor dari file": buka pemilih file
function pilihFileImpor() {
  el('fileImpor').value = '';    // supaya file yang sama bisa dipilih lagi
  el('fileImpor').click();
}

// Dipanggil setelah pengguna memilih file
function imporDariFile(event) {
  var file = event.target.files[0];
  if (!file) {
    return;
  }
  if (file.size > BATAS_FILE_IMPOR) {
    aturStatusCadangan('File terlalu besar (maksimal 2 MB).', true);
    return;
  }
  var pembaca = new FileReader();
  pembaca.onload = function () {
    prosesImpor(String(pembaca.result));
  };
  pembaca.onerror = function () {
    aturStatusCadangan('File tidak bisa dibaca.', true);
  };
  pembaca.readAsText(file);
}

// Memeriksa isi file, meminta konfirmasi, lalu memakainya
function prosesImpor(teks) {
  var json;
  try {
    json = JSON.parse(teks);
  } catch (error) {
    aturStatusCadangan('File bukan JSON yang valid.', true);
    return;
  }

  // Menerima juga bentuk dari JSONBin: { record: {...} }
  var isi = (json && json.record && !Array.isArray(json.lots)) ? json.record : json;
  if (!isi || !Array.isArray(isi.lots) || !Array.isArray(isi.rows)) {
    aturStatusCadangan('Bukan file cadangan Warehouse.', true);
    return;
  }

  var data = bersihkanDataLuar(isi);
  var lokal = { lots: DATA.lot, rows: DATA.rak, updated: DATA.waktuUpdate };

  var setuju = window.confirm(
    'Ganti data di HP ini dengan isi file?\n\n' +
    'File: ' + ringkasan(data) + '\n' +
    'HP ini: ' + ringkasan(lokal) + '\n\n' +
    'Data di HP ini akan hilang. Disarankan Ekspor dulu.'
  );
  if (!setuju) {
    aturStatusCadangan('Dibatalkan. Data HP tidak berubah.', false);
    return;
  }

  terapkanData(data);
  catatWaktuUpdate();    // dihitung sebagai perubahan baru (ikut tersinkron jika sinkron otomatis aktif)

  var pesan = 'Data dipulihkan: ' + data.lots.length + ' lotcode, ' + data.rows.length + ' baris.';
  if (data.dibuang > 0) {
    pesan += ' ' + data.dibuang + ' data tidak valid dibuang.';
  }
  aturStatusCadangan(pesan, false);
}
