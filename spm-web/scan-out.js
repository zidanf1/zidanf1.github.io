/* ============================================================
   8. SCAN OUT
   
   Input wajib:
   ● Line     → dropdown Line 1–25
   ● Lot Code → input teks bebas
   ● Barcode  → format 0211 + 9 digit

   Data ke server:
   POST /config/scan-out.php → { lotcode, barcode_bag, line, username }

   Response dari server:
   { lotcode, qty, size, nilai }
   ============================================================ */

let soData = []; // menyimpan semua baris tabel Scan Out

/** Inisialisasi halaman Scan Out — reset semua state */
function soInit() {
  soData = []; // kosongkan data tabel

  // Kosongkan semua input
  document.getElementById('so-barcode').value = '';
  document.getElementById('so-lotcode').value = '';
  document.getElementById('so-line').value    = '';

  // Sembunyikan semua notifikasi error
  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');

  // Render tabel kosong
  soRenderTable();
}

/**
 * Proses scan out:
 * 1. Validasi semua input wajib
 * 2. Cek duplikat barcode
 * 3. Kirim ke server
 * 4. Tambahkan ke tabel
 */
async function soScan() {
  const line    = val('so-line');    // line produksi yang dipilih
  const lotcode = val('so-lotcode'); // lotcode yang diinput
  const barcode = val('so-barcode'); // barcode bag

  let valid = true; // flag validasi

  // Reset semua pesan error
  hideEl('so-line-err');
  hideEl('so-lot-err');
  hideEl('so-bc-err');
  hideEl('so-ok');

  // Validasi: Line wajib dipilih
  if (!line) {
    showErr('so-line-err', 'Line wajib dipilih');
    valid = false;
  }

  // Validasi: Lotcode wajib diisi
  if (!lotcode) {
    showErr('so-lot-err', 'Lot code wajib diisi');
    valid = false;
  }

  // Validasi: format barcode bag harus 0211 + 9 digit
  if (!barcode || !/^0211\d{9}$/.test(barcode)) {
    showErr('so-bc-err', 'Format tidak valid (awali 0211, 13 digit)');
    valid = false;
  }

  // Hentikan jika ada validasi yang gagal
  if (!valid) return;

  // Cek duplikat: barcode tidak boleh discan dua kali
  if (soData.find(d => d.barcode === barcode)) {
    showErr('so-bc-err', 'Barcode ini sudah discan');
    return;
  }

  show('so-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/config/scan-out.php', {
      lotcode:     lotcode,
      barcode_bag: barcode,
      line:        line,
      username:    SESSION.username,
    });

    // Tambahkan ke array data tabel
    soData.push({
      barcode: barcode,
      lotcode: res.data.lotcode, // lotcode dari server (konfirmasi)
      qty:     res.data.qty,     // QTY PO dari server
      size:    res.data.size,    // ukuran sepatu dari server
      nilai:   res.data.nilai,   // isi bag dalam pairs dari server
      line:    line,             // line yang dipilih operator
    });

    // Render ulang tabel
    soRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('so-ok', 'so-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' · ' + line
    );

    // Hanya reset barcode (line & lotcode tetap untuk scan berikutnya)
    document.getElementById('so-barcode').value = '';
    document.getElementById('so-barcode').focus();

  } catch (err) {
    showErr('so-bc-err', err.message); // tampilkan error dari server
  } finally {
    hide('so-loading'); // sembunyikan loading
  }
}

/**
 * Hapus baris dari tabel Scan Out
 * Kirim request hapus ke server, lalu hapus dari array lokal
 * @param {number} i - index baris yang dihapus
 */
async function soDelete(i) {
  const row = soData[i];
  if (!row) return;

  // Konfirmasi sebelum hapus
  if (!confirm('Hapus barcode ' + row.barcode + '?')) return;

  // Tampilkan loading
  show('so-loading');
  hideEl('so-bc-err');

  try {
    // Kirim request hapus ke server
    await apiRequest('POST', '/config/delete-scan-out.php', {
      barcode_bag: row.barcode,
      username:    SESSION.username,
    });

    // Hapus dari array lokal setelah server konfirmasi
    soData.splice(i, 1);
    soRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('so-ok', 'so-ok-msg', 'Barcode ' + row.barcode + ' berhasil dihapus');

  } catch (err) {
    showErr('so-bc-err', 'Gagal hapus: ' + err.message);
  } finally {
    hide('so-loading');
  }
}

/** Render ulang tabel DATA BON OUT dari array soData */
function soRenderTable() {
  const tbody = document.getElementById('so-tbody');
  const tot   = document.getElementById('so-total');

  // Jika tidak ada data, tampilkan baris kosong
  if (!soData.length) {
    tbody.innerHTML   = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  // Hitung total pairs
  let totalPairs = 0;

  // Render setiap baris tabel
  tbody.innerHTML = soData.map((d, i) => {
    totalPairs += parseInt(d.nilai);
    return `<tr>
      <td class="mono">${d.barcode}</td>
      <td>${d.lotcode}</td>
      <td class="tc">${d.qty}</td>
      <td class="tc">${d.size}</td>
      <td class="tc">${d.nilai}</td>
      <td>${d.line}</td>
      <td><button class="del-btn" onclick="soDelete(${i})">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button></td>
    </tr>`;
  }).join('');

  // Update baris total
  setTxt('so-total-bag',   soData.length);
  setTxt('so-total-pairs', totalPairs);
  tot.style.display = 'flex';
}

