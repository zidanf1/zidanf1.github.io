/* ============================================================
   7. SCAN IN
   
   ALUR:
   Scan Box → Scan Bag (berulang) → Ganti Box → Scan Bag → dst
   
   Input tunggal — sistem otomatis deteksi jenis:
   ● Awalan "BOX-"      → proses sebagai Box
   ● Format 0211XXXXXXXXX → proses sebagai Bag
   
   Data ke server:
   ● Scan Box : POST /scan-in/box  → { barcode_box, username }
   ● Scan Bag : POST /scan-in/bag  → { barcode_bag, username }

   Response dari server:
   ● Scan Box : { id_box }
   ● Scan Bag : { lotcode, qty, size, nilai }
   ============================================================ */

let siData  = []; // menyimpan semua baris tabel Scan In
let siIdBox = null; // id_box aktif dari server (diset saat scan box)

/** Inisialisasi halaman Scan In — reset semua state */
function siInit() {
  siData  = [];   // kosongkan data tabel
  siIdBox = null; // reset box aktif

  // Kosongkan input
  document.getElementById('si-input').value = '';

  // Sembunyikan semua notifikasi
  hideEl('si-err');
  hideEl('si-ok');
  hideEl('si-box-active');

  // Set flowchart ke langkah pertama
  siSetFlow('box');

  // Render tabel kosong
  siRenderTable();
}

/**
 * Update tampilan flowchart (Scan Box → Scan Bag → Selesai)
 * Langkah sebelumnya ditandai 'done', langkah aktif ditandai 'active'
 *
 * @param {string} step - 'box' | 'bag' | 'done'
 */
function siSetFlow(step) {
  const steps = ['box', 'bag', 'done']; // urutan langkah
  const activeIdx = steps.indexOf(step); // index langkah yang aktif

  steps.forEach((s, i) => {
    const el = document.getElementById('fl-' + s);
    if (!el) return;

    el.classList.remove('active', 'done'); // reset semua class

    if (i < activeIdx)       el.classList.add('done');   // langkah sebelumnya → hijau
    else if (i === activeIdx) el.classList.add('active'); // langkah aktif → biru
    // langkah setelahnya tetap abu-abu (tidak ada class)
  });
}

/** Dipanggil saat tombol Scan ditekan — deteksi jenis barcode */
async function siScan() {
  const input = val('si-input'); // ambil nilai input

  // Reset notifikasi
  hideEl('si-err');
  hideEl('si-ok');

  // Validasi tidak kosong
  if (!input) {
    showErr('si-err', 'Barcode wajib diisi');
    return;
  }

  // Deteksi jenis barcode berdasarkan awalan
  if (input.toUpperCase().startsWith('BOX-')) {
    await siProcessBox(input.toUpperCase()); // proses sebagai box
  } else {
    await siProcessBag(input); // proses sebagai bag
  }
}

/**
 * Proses scan box:
 * 1. Kirim ke server → dapat id_box
 * 2. Simpan id_box sebagai box aktif
 * 3. Update flowchart ke langkah scan bag
 */
async function siProcessBox(barcode) {
  show('si-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/config/box.php', {
      barcode_box: barcode,
      username:    SESSION.username,
    });

    // Simpan id_box yang diterima dari server
    siIdBox = res.data.id_box;

    // Tampilkan info box aktif
    setTxt('si-box-info', barcode + ' → ID: ' + siIdBox);
    showFlex('si-box-active');
    setTxt('si-hint', 'Scan bag sekarang');

    // Update flowchart ke langkah bag
    siSetFlow('bag');

    // Tampilkan notifikasi sukses
    flashOk('si-ok', 'si-ok-msg', 'Box aktif: ' + siIdBox + ' — scan bag sekarang');

    // Kosongkan input & fokus untuk scan berikutnya
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();

  } catch (err) {
    showErr('si-err', err.message); // tampilkan error dari server
  } finally {
    hide('si-loading'); // sembunyikan loading
  }
}

/**
 * Proses scan bag:
 * 1. Validasi: harus ada box aktif dulu
 * 2. Validasi format barcode: 0211 + 9 digit
 * 3. Cek duplikat dalam sesi ini
 * 4. Kirim ke server → dapat lotcode, qty, size, nilai
 * 5. Tambahkan ke tabel dengan id_box aktif
 */
async function siProcessBag(barcode) {

  // Cek: apakah sudah ada box aktif?
  if (!siIdBox) {
    showErr('si-err', 'Scan box dulu sebelum scan bag');
    return;
  }

  // Validasi format barcode bag: harus awali 0211 dan total 13 digit
  if (!/^0211\d{9}$/.test(barcode)) {
    showErr('si-err', 'Format bag tidak valid (awali 0211, 13 digit)');
    return;
  }

  // Cek duplikat: apakah barcode ini sudah discan di sesi ini?
  if (siData.find(d => d.barcode === barcode)) {
    showErr('si-err', 'Barcode bag ini sudah discan');
    return;
  }

  show('si-loading'); // tampilkan loading

  try {
    // Kirim ke server
    const res = await apiRequest('POST', '/config/bag.php', {
      barcode_bag: barcode,
      username:    SESSION.username,
      barcode_box: siIdBox, // kirim juga id_box untuk validasi di server
    });

    // Tambahkan ke array data tabel
    siData.push({
      barcode: barcode,          // barcode bag
      lotcode: res.data.lotcode, // dari server
      qty:     res.data.qty,     // jumlah PO (dari server)
      size:    res.data.size,    // ukuran sepatu (dari server)
      nilai:   res.data.nilai,   // isi bag dalam pairs (dari server)
      id_box:  res.data.id_box   // box yang sedang aktif
    });

    // Render ulang tabel
    siRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('si-ok', 'si-ok-msg',
      barcode + ' — ' + res.data.lotcode +
      ' · QTY:' + res.data.qty +
      ' · Size:' + res.data.size +
      ' · ' + res.data.nilai + ' pairs'
    );

    // Animasi flowchart: tampilkan 'done' sebentar lalu kembali ke 'bag'
    siSetFlow('done');
    setTimeout(() => siSetFlow('bag'), 1500);

    // Kosongkan input & fokus untuk scan berikutnya
    document.getElementById('si-input').value = '';
    document.getElementById('si-input').focus();

  } catch (err) {
    showErr('si-err', err.message); // tampilkan error dari server
  } finally {
    hide('si-loading'); // sembunyikan loading
  }
}

/**
 * Hapus baris dari tabel Scan In
 * Kirim request hapus ke server, lalu hapus dari array lokal
 * @param {number} i - index baris yang dihapus
 */
async function siDeleteRow(i) {
  const row = siData[i];
  if (!row) return;

  // Konfirmasi sebelum hapus
  if (!confirm('Hapus barcode ' + row.barcode + '?')) return;

  // Tampilkan loading
  show('si-loading');
  hideEl('si-err');

  try {
    // Kirim request hapus ke server
    await apiRequest('POST', '/config/delete-bag.php', {
      barcode_bag: row.barcode,
      username:    SESSION.username,
    });

    // Hapus dari array lokal setelah server konfirmasi
    siData.splice(i, 1);
    siRenderTable();

    // Tampilkan notifikasi sukses
    flashOk('si-ok', 'si-ok-msg', 'Barcode ' + row.barcode + ' berhasil dihapus');

  } catch (err) {
    showErr('si-err', 'Gagal hapus: ' + err.message);
  } finally {
    hide('si-loading');
  }
}

/** Render ulang tabel DATA SCAN IN dari array siData */
function siRenderTable() {
  const tbody = document.getElementById('si-tbody');
  const tot   = document.getElementById('si-total');

  // Jika tidak ada data, tampilkan baris kosong
  if (!siData.length) {
    tbody.innerHTML   = '<tr><td colspan="7" class="empty-cell">Belum ada data</td></tr>';
    tot.style.display = 'none';
    return;
  }

  // Hitung total pairs dari semua baris
  let totalPairs = 0;

  // Render setiap baris tabel
  tbody.innerHTML = siData.map((d, i) => {
    totalPairs += parseInt(d.nilai); // akumulasi pairs
    return `<tr>
      <td class="mono">${d.barcode}</td>
      <td>${d.lotcode}</td>
      <td class="tc">${d.qty}</td>
      <td class="tc">${d.size}</td>
      <td class="tc">${d.nilai}</td>
      <td class="mono">${d.id_box}</td>
      <td><button class="del-btn" onclick="siDeleteRow(${i})">
        <i class="ti ti-trash" style="font-size:14px"></i>
      </button></td>
    </tr>`;
  }).join('');

  // Update baris total
  setTxt('si-total-bag',   siData.length);
  setTxt('si-total-pairs', totalPairs);
  tot.style.display = 'flex'; // tampilkan baris total
}

