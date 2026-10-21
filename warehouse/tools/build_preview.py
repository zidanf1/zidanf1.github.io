"""Membuat pratinjau SATU FILE (warehouse-preview.html) dari index.html + app.js.
Pratinjau hanya mode lokal (tanpa Supabase) dan berisi data contoh. Dipakai untuk diterbitkan sebagai halaman web.
Pemakaian (dari folder proyek):  python tools/build_preview.py
"""
import re, base64
logo = 'data:image/png;base64,' + base64.b64encode(open('icons/logo-64.png', 'rb').read()).decode()   # PNG bertransparansi
h = open('index.html', encoding='utf8').read(); j = open('app.js', encoding='utf8').read()
h = h.replace('<link rel="manifest" href="manifest.json"><link rel="icon" href="icons/icon-192.png">', f'<link rel="icon" href="{logo}">').replace('icons/logo-64.png', logo)
j = re.sub(r"const CFG=.*?\n", "const CFG={SUPABASE_URL:'',SUPABASE_KEY:''}; // pratinjau: mode lokal saja\n", j, count=1)
j = '\n'.join(l for l in j.split('\n') if 'serviceWorker' not in l or 'getRegistrations' in l) + '\n'   # tanpa Service Worker
seed = '''async function seed(){
 if((await all('rows')).length||(await getMeta('seeded')))return;
 const t=Date.now(),iso=n=>new Date(t+n).toISOString();
 for(const [l,m,s,p,q] of [['J01T88','TD','S1','SPK01',2009],['J08T123','MEN','S2','SPK02',123]])await put('items',{lotcode:l,model:m,style:s,spk:p,qty:q,updated_at:iso(0),deleted:false});
 let n=0;for(const [r,l] of [['A1-1','J01T88'],['A1-2','J08T123'],['A1-3',''],['A2-4','J01T88'],['A6-1','J08T123'],['A6-2',''],['STG','']])await put('rows',{id:crypto.randomUUID(),idrak:r,lotcode:l,created:iso(++n),updated_at:iso(n),deleted:false});
 await setMeta('seeded',1)}
'''
assert 'net();purgeOldDB().then(load).then(()=>{sync();rtConnect()});' in j, 'baris start aplikasi berubah; sesuaikan skrip ini'
j = j.replace('net();purgeOldDB().then(load).then(()=>{sync();rtConnect()});', seed + 'net();purgeOldDB().then(seed).then(load).then(()=>{sync();rtConnect()});')
h = h.replace('<script src="app.js"></script>', '<script>' + j + '</script>')
open('warehouse-preview.html', 'w', encoding='utf8').write(h)
print('OK  warehouse-preview.html', len(h) // 1024, 'KB')
