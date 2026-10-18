"""Naikkan nomor versi di semua tempat sekaligus.
Pemakaian (dari folder proyek):  python tools/bump_version.py 15
"""
import re, sys
n = sys.argv[1]
def sub(path, pats):
    s = open(path, encoding='utf8').read()
    for a, b in pats:
        s, c = re.subn(a, b, s)
        assert c >= 1, f'{path}: pola tidak ditemukan: {a}'
    open(path, 'w', encoding='utf8').write(s)
sub('index.html', [(r'(<meta name="app-version" content=")\d+(")', rf'\g<1>{n}\2'),
                   (r"(window\.WH_VER!==')\d+(')", rf'\g<1>{n}\2'),
                   (r'(<small>Versi )\d+(</small>)', rf'\g<1>{n}\2')])
sub('app.js',     [(r"(window\.WH_VER=')\d+(')", rf'\g<1>{n}\2')])
sub('sw.js',      [(r"(warehouse-v)\d+", rf'\g<1>{n}')])
print('Versi sekarang:', n)
