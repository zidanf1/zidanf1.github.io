"""
build.py : membuat file MANDIRI "warehouse.html"

File mandiri = satu file HTML yang berisi semua CSS, JavaScript, font, dan logo.
Bisa dibuka langsung dari HP / komputer tanpa server dan tanpa internet.

Cara pakai (butuh Python 3, tanpa library tambahan):
    python3 build.py

Hasilnya: warehouse.html di folder ini.
Proyek di folder ini sendiri TIDAK perlu di-build untuk dipasang di GitHub Pages.
"""

import base64
import re
from pathlib import Path

FOLDER = Path(__file__).parent


def data_uri(path, jenis):
    """Mengubah sebuah file menjadi teks data:... supaya bisa ditanam di HTML."""
    isi = base64.b64encode(Path(path).read_bytes()).decode()
    return 'data:' + jenis + ';base64,' + isi


html = (FOLDER / 'index.html').read_text(encoding='utf-8')
logo = data_uri(FOLDER / 'icons' / 'logo-96.png', 'image/png')


# 1. CSS: <link rel="stylesheet" href="css/..."> diganti isi file CSS-nya
def tanam_css(cocok):
    css = (FOLDER / cocok.group(1)).read_text(encoding='utf-8')
    # font dalam CSS ikut ditanam
    css = re.sub(
        r'url\("\.\./(fonts/[^"]+)"\)',
        lambda f: 'url("' + data_uri(FOLDER / f.group(1), 'font/woff2') + '")',
        css,
    )
    return '<style>\n' + css + '</style>'


html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', tanam_css, html)


# 2. JavaScript: <script src="js/..."></script> diganti isi file JS-nya
def tanam_js(cocok):
    js = (FOLDER / cocok.group(1)).read_text(encoding='utf-8')
    if cocok.group(1).endswith('config.js'):
        # file mandiri tidak memakai service worker
        js = js.replace('PAKAI_SERVICE_WORKER: true', 'PAKAI_SERVICE_WORKER: false')
    return '<script>\n' + js + '</script>'


html = re.sub(r'<script src="([^"]+)"></script>', tanam_js, html)

# 3. Logo di bar atas dan ikon tab ditanam; tautan PWA dibuang
html = html.replace('src="icons/logo-96.png"', 'src="' + logo + '"')
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', '', html)
html = html.replace('<link rel="icon" href="icons/icon-192.png">', '<link rel="icon" href="' + logo + '">')

hasil = FOLDER / 'warehouse.html'
hasil.write_text(html, encoding='utf-8')
print('Selesai:', hasil, '(%d KB)' % (hasil.stat().st_size // 1024))
