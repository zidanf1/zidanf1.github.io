// =====================================================
// HALAMAN FORM LOTCODE
// Menambah, memperbarui, dan menghapus lotcode.
// =====================================================

// Mengisi pilihan Type di form
function buatPilihanTipe() {
  var html = '<option value="">-- Type --</option>';
  for (var i = 0; i < KONFIG.TIPE.length; i++) {
    html += '<option value="' + KONFIG.TIPE[i] + '">' + KONFIG.TIPE[i] + '</option>';
  }
  el('inputTipe').innerHTML = html;
}

// Menampilkan daftar lotcode yang sudah disimpan
function tampilkanDaftarLot() {
  if (DATA.lot.length === 0) {
    el('isiDaftarLot').innerHTML = '<tr><td colspan="2" class="muted">Belum ada lotcode</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < DATA.lot.length; i++) {
    var lot = DATA.lot[i];
    // Kiri: lotcode (tebal) lalu type dan qty di bawahnya. Kanan: tombol Hapus.
    html += '<tr>';
    html += '<td><b>' + aman(lot.lot) + '</b><div class="muted">' + aman(lot.tipe ? lot.tipe : '-') + ' · Qty ' + aman(lot.qty) + '</div></td>';
    html += '<td><button class="btn merah" onclick="hapusLot(' + i + ')">Hapus</button></td>';
    html += '</tr>';
  }
  el('isiDaftarLot').innerHTML = html;
}

// Tombol Simpan di form
function simpanLotcode() {
  var lot = el('inputLot').value.trim().toUpperCase();
  var tipe = el('inputTipe').value;
  var qtyTeks = el('inputQty').value;
  var qty = Number(qtyTeks);

  if (lot === '' || tipe === '' || qtyTeks === '' || qty < 0) {
    el('pesan').textContent = 'Isi lotcode, type, dan qty.';
    return;
  }

  var sudahAda = cariLot(lot);
  if (sudahAda) {
    // Lotcode sudah ada: perbarui qty dan type-nya
    sudahAda.qty = qty;
    sudahAda.tipe = tipe;
  } else {
    DATA.lot.push({ lot: lot, qty: qty, tipe: tipe });
  }
  simpanLot();

  el('inputLot').value = '';
  el('inputTipe').value = '';
  el('inputQty').value = '';
  el('pesan').textContent = 'Tersimpan.';
  tampilkanSemua();

  // Jika form ini dibuka dari popup Form Data Rak, kembali ke sana (lihat rack-popup.js)
  if (UI.tujuanKembali) {
    kembaliKePopup(lot);
  }
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
