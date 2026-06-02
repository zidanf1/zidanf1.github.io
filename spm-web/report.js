/* ============================================================
   10. REPORT

   Menampilkan ringkasan transaksi per tanggal per Line + Lotcode
   Tab 1 — Resume  : tabel lengkap dengan filter & ekspor gambar
   Tab 2 — Grafik  : progress bar target pengeluaran per Line

   Fitur:
   ● Tanggal bisa diklik → kalender popup
   ● Stat cards: Scan IN, Scan OUT, Sisa Stok
   ● Filter per Line (dropdown) + pencarian Lotcode
   ● Baris total di tfoot tabel
   ● Grafik target OUT vs SPK per Line (progress bar berwarna)
   ● Ekspor tabel sebagai gambar PNG
   ============================================================ */

let rptData        = [];          // data laporan dari server
let rptActiveTab   = 'resume';    // tab aktif saat ini
let rptSelDate     = new Date();  // tanggal yang dipilih
let rptCalViewDate = new Date();  // bulan yang ditampilkan di kalender

const RPT_CAL_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];
const RPT_CAL_DAYS   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

/* ── Format tanggal ke string Indonesia ───────────────── */
function rptFmtDate(d) {
  return d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

/* ── Format angka ribuan ──────────────────────────────── */
function rptFmt(n) { return (n || 0).toLocaleString('id-ID'); }

/* ── Update tombol tanggal ────────────────────────────── */
function rptSetDateLabel() {
  setTxt('rpt-date', rptFmtDate(rptSelDate));
}

/* ── Kalender: buka ───────────────────────────────────── */
function rptCalOpen() {
  rptCalViewDate = new Date(rptSelDate);
  const btn    = document.getElementById('rpt-date-btn');
  const popup  = document.getElementById('rpt-cal-popup');
  const rect   = btn.getBoundingClientRect();
  popup.style.top  = (rect.bottom + 6) + 'px';
  popup.style.left = Math.max(8, rect.left) + 'px';
  rptCalRender();
  document.getElementById('rpt-cal-overlay').classList.add('open');
}

/* ── Kalender: tutup ──────────────────────────────────── */
function rptCalClose(e) {
  if (e && e.target !== document.getElementById('rpt-cal-overlay')) return;
  document.getElementById('rpt-cal-overlay').classList.remove('open');
}

/* ── Kalender: ganti bulan ────────────────────────────── */
function rptCalMonth(dir) {
  rptCalViewDate.setMonth(rptCalViewDate.getMonth() + dir);
  rptCalRender();
}

/* ── Kalender: render grid ────────────────────────────── */
function rptCalRender() {
  setTxt('rpt-cal-title', RPT_CAL_MONTHS[rptCalViewDate.getMonth()] + ' ' + rptCalViewDate.getFullYear());
  const grid  = document.getElementById('rpt-cal-grid');
  const today = new Date();
  const first = new Date(rptCalViewDate.getFullYear(), rptCalViewDate.getMonth(), 1);
  const last  = new Date(rptCalViewDate.getFullYear(), rptCalViewDate.getMonth() + 1, 0);

  grid.innerHTML = RPT_CAL_DAYS.map(d => `<div class="cal-dow">${d}</div>`).join('');

  // leading blanks
  for (let i = 0; i < first.getDay(); i++) grid.innerHTML += '<div></div>';

  for (let d = 1; d <= last.getDate(); d++) {
    const date  = new Date(rptCalViewDate.getFullYear(), rptCalViewDate.getMonth(), d);
    const isTod = date.toDateString() === today.toDateString();
    const isSel = date.toDateString() === rptSelDate.toDateString();
    grid.innerHTML += `<button class="cal-day${isTod ? ' today' : ''}${isSel ? ' cal-selected' : ''}"
      onclick="rptCalSelect(${rptCalViewDate.getFullYear()},${rptCalViewDate.getMonth()},${d})">${d}</button>`;
  }
}

/* ── Kalender: pilih hari ─────────────────────────────── */
function rptCalSelect(y, m, d) {
  rptSelDate = new Date(y, m, d);
  rptSetDateLabel();
  document.getElementById('rpt-cal-overlay').classList.remove('open');
  rptInit(); // load ulang data untuk tanggal terpilih
}

/* ── Kalender: tombol "Hari Ini" ──────────────────────── */
function rptCalToday() {
  rptSelDate = new Date();
  rptSetDateLabel();
  document.getElementById('rpt-cal-overlay').classList.remove('open');
  rptInit();
}

/* ── Tombol refresh ───────────────────────────────────── */
function rptRefresh() {
  const ic = document.getElementById('rpt-refresh-icon');
  if (ic) ic.style.animation = 'spin 1s linear infinite';
  rptInit().finally(() => { if (ic) ic.style.animation = ''; });
}

/* ── Switch tab ───────────────────────────────────────── */
function rptSwitchTab(t) {
  rptActiveTab = t;
  ['resume', 'grafik'].forEach(x => {
    document.getElementById('rpt-tab-' + x).classList.toggle('active', x === t);
    document.getElementById('rpt-view-' + x).style.display = x === t ? 'block' : 'none';
  });
  if (t === 'grafik') rptRenderGrafik();
}

/* ── Update stat cards ────────────────────────────────── */
function rptUpdateStats() {
  const tIn  = rptData.reduce((a, d) => a + (d.input  || 0), 0);
  const tOut = rptData.reduce((a, d) => a + (d.output || 0), 0);
  const tNet = tIn - tOut;
  const mx   = Math.max(tIn, tOut, tNet, 1);

  setTxt('rpt-in-val',    rptFmt(tIn));
  setTxt('rpt-in-sub',    rptData.filter(d => d.input > 0).length + ' baris');
  setTxt('rpt-out-val',   rptFmt(tOut));
  setTxt('rpt-out-sub',   rptData.filter(d => d.output > 0).length + ' baris');
  setTxt('rpt-stock-val', rptFmt(tNet));
  setTxt('rpt-stock-sub', tIn > 0 ? Math.round(tNet / tIn * 100) + '% dari IN' : '—');

  setTimeout(() => {
    const bi = document.getElementById('rpt-bar-in');
    const bo = document.getElementById('rpt-bar-out');
    const bs = document.getElementById('rpt-bar-stk');
    if (bi) bi.style.width = Math.round(tIn  / mx * 100) + '%';
    if (bo) bo.style.width = Math.round(tOut / mx * 100) + '%';
    if (bs) bs.style.width = Math.round(tNet / mx * 100) + '%';
  }, 120);
}

/** Inisialisasi halaman Report: load data dari server */
async function rptInit() {

  // Label tanggal
  rptSetDateLabel();

  // Reset filter
  const srch = document.getElementById('rpt-search');
  if (srch) srch.value = '';
  const rptLineEl = document.getElementById('rpt-line');
  if (rptLineEl) rptLineEl.value = '';

  try {
    // Ambil data laporan dari server (kirim tanggal yang dipilih)
    const dateStr = rptSelDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const res = await apiRequest('GET', '/report.php?username=' + SESSION.username + '&date=' + dateStr);
    rptData   = res.data || [];
  } catch (err) {
    console.error('Gagal load report:', err.message);
    rptData = [];
  }

  rptUpdateStats();
  rptRender();
  if (rptActiveTab === 'grafik') rptRenderGrafik();
}

/**
 * Render tabel Resume dengan filter yang aktif
 */
function rptRender() {
  const q       = (document.getElementById('rpt-search')?.value || '').toLowerCase();
  const selLine = document.getElementById('rpt-line')?.value || '';

  const rows = rptData.filter(d => {
    const mQ = !q || (d.lotcode || '').toLowerCase().includes(q) || (d.line || '').toLowerCase().includes(q);
    const mL = !selLine || d.line === selLine;
    return mQ && mL;
  });

  const tbody = document.getElementById('rpt-tbody');
  const tfoot = document.getElementById('rpt-tfoot');

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--t4);font-size:12px">Tidak ada data</td></tr>';
    tfoot.innerHTML = '';
    setTxt('rpt-showing', '0');
    setTxt('rpt-net',     '0 pairs');
    return;
  }

  tbody.innerHTML = rows.map(d => {
    const net = (d.input || 0) - (d.output || 0);
    return `<tr>
      <td><span class="line-badge">${d.line || '—'}</span></td>
      <td class="lot-main">${d.lotcode}</td>
      <td class="qty-val">${rptFmt(d.qty)}</td>
      <td class="in-val">${rptFmt(d.input)}</td>
      <td class="out-val">${rptFmt(d.output)}</td>
      <td class="net-val">${rptFmt(net)}</td>
    </tr>`;
  }).join('');

  const tIn  = rows.reduce((a, d) => a + (d.input  || 0), 0);
  const tOut = rows.reduce((a, d) => a + (d.output || 0), 0);
  const tQty = rows.reduce((a, d) => a + (d.qty    || 0), 0);
  const net  = tIn - tOut;

  tfoot.innerHTML = `<tr style="background:#f9fafb">
    <td colspan="2" style="padding:7px 8px;font-size:10px;font-weight:500;color:#9ca3af">TOTAL (${rows.length} baris)</td>
    <td class="qty-val" style="padding:7px 8px">${rptFmt(tQty)}</td>
    <td class="in-val"  style="padding:7px 8px">${rptFmt(tIn)}</td>
    <td class="out-val" style="padding:7px 8px">${rptFmt(tOut)}</td>
    <td class="net-val" style="padding:7px 8px">${rptFmt(net)}</td>
  </tr>`;

  setTxt('rpt-showing', rows.length);
  setTxt('rpt-net',     rptFmt(net) + ' pairs');
}

/**
 * Render Grafik Target: progress bar OUT vs SPK per Line
 */
function rptRenderGrafik() {
  // Kelompokkan data per Line
  const lineMap = {};
  rptData.forEach(d => {
    if (!lineMap[d.line]) lineMap[d.line] = { line: d.line, qty: 0, output: 0 };
    lineMap[d.line].qty    += (d.qty    || 0);
    lineMap[d.line].output += (d.output || 0);
  });
  const lines = Object.values(lineMap).sort((a, b) =>
    a.line.localeCompare(b.line, undefined, { numeric: true })
  );

  // Summary total
  const tQty = lines.reduce((a, d) => a + d.qty,    0);
  const tOut = lines.reduce((a, d) => a + d.output, 0);
  const gPct = tQty > 0 ? Math.round(tOut / tQty * 100) : 0;

  setTxt('rpt-g-target', rptFmt(tQty));
  setTxt('rpt-g-actual', rptFmt(tOut));
  setTxt('rpt-g-pct',    gPct + '%');

  const pctEl = document.getElementById('rpt-g-pct');
  if (pctEl) pctEl.style.color = gPct >= 80 ? 'var(--green-t)' : gPct >= 50 ? 'var(--amber-t)' : 'var(--red-t)';

  // Render progress bars
  const list = document.getElementById('rpt-prog-list');
  if (!list) return;

  if (!lines.length) {
    list.innerHTML = '<p style="text-align:center;color:var(--t4);font-size:12px;padding:16px">Tidak ada data</p>';
    return;
  }

  list.innerHTML = lines.map(d => {
    const pct     = d.qty > 0 ? Math.round(d.output / d.qty * 100) : 0;
    const cls     = pct >= 80 ? 'ok' : pct >= 50 ? 'mid' : 'low';
    const pctCls  = pct >= 80 ? 'rpt-pct-ok' : pct >= 50 ? 'rpt-pct-mid' : 'rpt-pct-low';
    return `<div class="rpt-prog-item">
      <div class="rpt-prog-head">
        <span class="rpt-prog-name">${d.line}</span>
        <span class="rpt-prog-pct ${pctCls}">${pct}%</span>
      </div>
      <div class="rpt-prog-track">
        <div class="rpt-prog-bar ${cls}" style="width:0%" data-w="${pct}"></div>
      </div>
      <div class="rpt-prog-labels">
        <span class="rpt-prog-lbl">OUT: <strong>${rptFmt(d.output)}</strong></span>
        <span class="rpt-prog-lbl">Target Line: <strong>${rptFmt(d.qty)}</strong></span>
      </div>
    </div>`;
  }).join('');

  // Animasikan bar setelah DOM terender
  setTimeout(() => {
    document.querySelectorAll('.rpt-prog-bar').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 100);
}

/**
 * Ekspor tabel Resume sebagai gambar PNG
 */
function rptExport() {
  if (!window.html2canvas) {
    const script  = document.createElement('script');
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => _doExport();
    document.head.appendChild(script);
  } else {
    _doExport();
  }
}

/** Jalankan proses capture dan download gambar */
function _doExport() {
  const card = document.getElementById('rpt-card'); // element yang akan di-capture
  const btn  = card?.querySelector('.btn-export');  // tombol export (akan disembunyikan saat capture)

  // Sembunyikan tombol agar tidak ikut tercapture dalam gambar
  if (btn) btn.style.display = 'none';

  // Buat nama file dengan tanggal hari ini
  const now   = new Date();
  const fname = 'laporan-' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '.png';

  // Capture element sebagai canvas
  html2canvas(card, {
    backgroundColor: '#ffffff', // latar putih
    scale:           2,          // resolusi 2x untuk ketajaman
    useCORS:         true,       // izinkan resource cross-origin
  }).then(canvas => {
    if (btn) btn.style.display = ''; // tampilkan kembali tombol

    // Buat link download dan klik otomatis
    const link      = document.createElement('a');
    link.download   = fname;
    link.href       = canvas.toDataURL('image/png'); // convert canvas ke data URL
    link.click();                                     // trigger download

  }).catch(err => {
    if (btn) btn.style.display = ''; // tampilkan kembali tombol
    console.error('Export gagal:', err);
    alert('Export gagal: ' + err.message);
  });
}

