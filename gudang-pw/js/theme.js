// =====================================================
// TEMA WARNA
// Daftar tema ada di config.js (KONFIG.TEMA).
// =====================================================

// Memasang tema: mengganti variabel warna CSS, warna bilah status HP, dan menyimpannya
function pasangTema(nama) {
  if (!KONFIG.TEMA[nama]) {
    nama = KONFIG.TEMA_BAWAAN;
  }
  UI.temaAktif = KONFIG.TEMA[nama];

  // Ganti warna lewat variabel CSS (lihat css/base.css)
  var gaya = document.documentElement.style;
  gaya.setProperty('--bar', UI.temaAktif.bar);
  gaya.setProperty('--strip', UI.temaAktif.strip);
  gaya.setProperty('--dark', UI.temaAktif.dark);
  gaya.setProperty('--page', UI.temaAktif.page);
  gaya.setProperty('--accent', UI.temaAktif.accent);

  // Warna bilah status HP
  var meta = document.querySelector('meta[name=theme-color]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = UI.temaAktif.bar;

  simpanData(KONFIG.KUNCI.tema, nama);

  // Tandai tombol tema yang sedang aktif
  var tombol = el('pilihanTema').children;
  for (var i = 0; i < tombol.length; i++) {
    tombol[i].className = (tombol[i].getAttribute('data-nama') === nama) ? 'btn aktif' : 'btn';
  }
}

// Membuat tombol-tombol pilihan tema
function buatPilihanTema() {
  var html = '';
  for (var nama in KONFIG.TEMA) {
    html += '<button class="btn" data-nama="' + nama + '" onclick="pilihTema(\'' + nama + '\')">' +
            '<span class="dot" style="background:' + KONFIG.TEMA[nama].bar + '"></span>' + nama + '</button>';
  }
  el('pilihanTema').innerHTML = html;
}

// Saat satu tema diketuk
function pilihTema(nama) {
  pasangTema(nama);
  el('panelTema').style.display = 'none';
}

// Menu "Tema": buka / tutup panel pilihan tema
function bukaTutupTema() {
  var panel = el('panelTema');
  panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
}
