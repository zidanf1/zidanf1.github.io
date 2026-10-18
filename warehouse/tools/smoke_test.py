"""Uji asap otomatis (Playwright). Supabase dipalsukan, jadi tidak butuh internet/akun.
Pemakaian (dari folder proyek):  python tools/smoke_test.py
Butuh: pip install playwright && playwright install chromium
"""
import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT = 8799
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); fails = []
def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok: fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*.supabase.co/**', lambda r: r.fulfill(status=200 if r.request.method == 'GET' else 201, content_type='application/json', body='[]' if r.request.method == 'GET' else ''))
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(500)
        def add(rak, lot, m='', q='', pick=False):
            pg.click('#add'); pg.select_option('#rak', rak)
            if lot:
                pg.fill('#q', lot)
                if pick: pg.click(f'#opts .o:has-text("{lot}")')
                else: pg.fill('#fModel', m); pg.fill('#fQty', q)
            pg.click('#dg .btn.b'); pg.wait_for_timeout(200)
        add('A1-1', 'j01t88', 'td', '2009'); add('A1-2', ''); add('A2-1', 'J01T88', pick=True); add('STG', '')
        hdr = pg.eval_on_selector_all('#th th', 'e=>e.map(x=>x.textContent)')
        check('Lotcode tepat setelah IDRak', hdr[:2] == ['IDRak', 'Lotcode'])
        check('Input otomatis huruf besar', pg.eval_on_selector_all('#tb tr', 'e=>e[0].innerText').startswith('A1-1') and 'J01T88' in pg.inner_text('#tb'))
        cls = pg.eval_on_selector_all('#tb tr', 'e=>e.map(x=>x.className)')
        check('Border tebal hanya antar rak (A1 | A2 | STG)', [('ge' in c) for c in cls] == [False, True, True, True])
        bw = pg.eval_on_selector_all('#tb tr', 'e=>e.map(x=>getComputedStyle(x.firstChild).borderBottomWidth)')
        check('Garis tipis (1px) tiap baris, tebal (3px) hanya saat rak berganti', bw == ['1px', '3px', '3px', '3px'])
        bg = pg.eval_on_selector_all('#tb tr', 'e=>e.map(x=>getComputedStyle(x.firstChild).backgroundColor)')
        check('Zebra per baris (bukan per rak): baris 1,3 sama; baris 2,4 sama; keduanya beda', len(bg) >= 4 and bg[0] == bg[2] and bg[1] == bg[3] and bg[0] != bg[1])
        pg.fill('#sq', 'a1-1'); pg.wait_for_timeout(80)
        check('Cari "A1-1" hanya cocok persis', len(pg.query_selector_all('#tb tr')) == 1)
        pg.fill('#sq', 'kosong'); pg.wait_for_timeout(80)
        check('Cari "KOSONG" menampilkan rak kosong', len(pg.query_selector_all('#tb tr')) == 2)
        pg.fill('#sq', '')
        pg.click('#add'); pg.select_option('#rak', 'A3-1'); pg.fill('#q', ''); pg.click('#q'); pg.keyboard.type('j0'); pg.wait_for_timeout(60)
        check('Lot mirip: tidak ada usulan "+ Lot baru" & form data tersembunyi', 'lot baru' not in pg.inner_text('#opts').lower() and not pg.is_visible('#lotf'))
        pg.fill('#q', ''); pg.click('#q'); pg.keyboard.type('zz9'); pg.wait_for_timeout(60)
        check('Tidak ada yang mirip: usulan lot baru + form data tampil', 'lot baru' in pg.inner_text('#opts').lower() and pg.is_visible('#lotf'))
        pg.click('#cx'); pg.wait_for_timeout(100)   # tutup dialog dari pemeriksaan sebelumnya
        add('B1-1', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456', 'td', '5')
        meas = """(()=>{const l=[...document.querySelectorAll('#tb .lt')],long=l.find(x=>x.textContent.length>20),short=l.find(x=>x.textContent==='J01T88');
          const ths=[...document.querySelectorAll('#th th')].map(x=>[x.textContent,x.getBoundingClientRect().width]);
          const w=Object.fromEntries(ths),t=document.querySelector('.tw');
          return {longCut:long.scrollWidth>long.clientWidth,ell:getComputedStyle(long).textOverflow,shortCut:short.scrollWidth>short.clientWidth,title:long.title.length,
                  lotW:w['Lotcode'],maxOther:Math.max(...ths.filter(x=>x[0]!=='Lotcode'&&x[0]).map(x=>x[1])),over:t.scrollWidth>t.clientWidth}})()"""
        info = pg.evaluate(meas)
        check('Kolom Lotcode adalah kolom terlebar & tabel tidak meluap (layar lebar)', info['lotW'] > info['maxOther'] and not info['over'])
        check('Layar lebar: lotcode panjang tampil utuh (tidak dipotong tanpa perlu)', not info['longCut'] and info['title'] > 20)
        pg.set_viewport_size({'width': 400, 'height': 700}); pg.wait_for_timeout(150)
        info = pg.evaluate(meas)
        check('Layar sempit: lotcode panjang dipotong dengan "..." (judul penuh di tooltip)', info['longCut'] and info['ell'] == 'ellipsis')
        check('Lotcode pendek tidak dipotong', not info['shortCut'])
        pg.set_viewport_size({'width': 1280, 'height': 720}); pg.wait_for_timeout(150)
        # --- urutan & perataan kolom, prioritas lebar lotcode ---
        cols = pg.eval_on_selector_all('#th th', 'e=>e.map(x=>x.textContent).filter(Boolean)')
        check('Urutan kolom: IDRak, Lotcode, Qty, Model (SPK/Qty di kiri Model/Style)', cols == ['IDRak', 'Lotcode', 'Qty', 'Model'])
        al = pg.evaluate("(()=>{const i=[...document.querySelectorAll('#th th')].findIndex(x=>x.textContent==='Qty');return [getComputedStyle(document.querySelectorAll('#th th')[i]).textAlign,getComputedStyle(document.querySelector('#tb tr').children[i]).textAlign]})()")
        check('Kolom Qty rata kiri (header & isi)', all(x in ('left', 'start') for x in al))
        pg.click('#add'); pg.select_option('#rak', 'B2-1'); pg.fill('#q', 'LOT-2026-10-BATCH-A'); pg.fill('#fModel', 'MODELPANJANGSEKALIABCDEFGHIJ'); pg.fill('#fQty', '3'); pg.click('#dg .btn.b'); pg.wait_for_timeout(250)
        pr = pg.evaluate("""(()=>{const l=[...document.querySelectorAll('#tb .lt')].find(x=>x.textContent==='LOT-2026-10-BATCH-A'),m=[...document.querySelectorAll('#tb .cx')].find(x=>x.textContent.startsWith('MODELPANJANG'));
          return {lotCut:l.scrollWidth>l.clientWidth,modelCut:m.scrollWidth>m.clientWidth}})()""")
        check('Lotcode (19 karakter) utuh, Model sangat panjang dipotong lebih dulu', (not pr['lotCut']) and pr['modelCut'])
        # --- urutan kolom bisa diubah dari menu Tampilan ---
        hd = lambda: pg.eval_on_selector_all('#th th', 'e=>e.map(x=>x.textContent).filter(Boolean)')
        pg.click('#hb'); pg.click('#cols [data-mv="-1"][data-c=model]'); pg.wait_for_timeout(80)
        check('Naikkan Model -> urutan Lotcode, Model, Qty', hd() == ['IDRak', 'Lotcode', 'Model', 'Qty'])
        check('Menu tetap terbuka setelah mengubah urutan', pg.is_visible('#menu'))
        check('Lotcode selalu tampil (tidak ada tombol sembunyikan, hanya tombol geser)', pg.eval_on_selector_all('#cols .cr:first-child button.cn', 'e=>e.length') == 0 and pg.eval_on_selector_all('#cols .cr:first-child button.mv', 'e=>e.length') == 2)
        pg.click('#cols [data-c=spk].cn'); pg.wait_for_timeout(80)
        check('Pilih SPK (ke-3) menggantikan yang terlama, urutan mengikuti pengaturan', hd() == ['IDRak', 'Lotcode', 'SPK', 'Qty'])
        pg.reload(); pg.wait_for_timeout(500)
        check('Urutan kolom tersimpan setelah muat ulang', hd() == ['IDRak', 'Lotcode', 'SPK', 'Qty'])
        pg.click('#hb'); pg.click('#cols [data-mv="1"][data-c=lotcode]'); pg.wait_for_timeout(80)
        check('Lotcode bisa digeser ke kanan (melewati SPK)', hd() == ['IDRak', 'SPK', 'Lotcode', 'Qty'])
        pg.reload(); pg.wait_for_timeout(500)
        check('Posisi Lotcode tersimpan, dan tetap tampil', hd() == ['IDRak', 'SPK', 'Lotcode', 'Qty'] and len(pg.query_selector_all('#tb .lt')) > 0)
        pg.click('#hb'); pg.click('#cols [data-mv="-1"][data-c=lotcode]'); pg.wait_for_timeout(80)
        check('Lotcode bisa digeser kembali ke depan', hd() == ['IDRak', 'Lotcode', 'SPK', 'Qty'])
        # --- Bagikan via WhatsApp: grup per model, urut per lotcode, baris "idrak > lotcode qty" ---
        pg.fill('#sq', ''); pg.wait_for_timeout(80)
        txt = pg.evaluate("shareBuild('all')[0]")
        check('Teks bagikan: judul + ringkasan di bagian atas', txt.startswith('*📦 WAREHOUSE – MAPS*') and 'model ·' in txt.split('\n\n')[0])
        check('Grup per model, baris diurut per lotcode', '*TD*\nB1-1 > ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 5\nA1-1 > J01T88 2009\nA2-1 > J01T88 2009' in txt)
        check('Rak kosong dikumpulkan di akhir', txt.rstrip().endswith('*RAK KOSONG*\nA1-2 > kosong\nSTG > kosong'))
        pg.fill('#sq', 'LOT-2026'); pg.wait_for_timeout(80)
        vis = pg.evaluate("shareBuild('vis')[0]"); allt = pg.evaluate("shareBuild('all')[0]")
        check('Cakupan "yang tampil" ikut pencarian, "semua" tidak', '🔎 Pencarian: LOT-2026' in vis and 'A1-1 > J01T88' not in vis and 'A1-1 > J01T88' in allt)
        pg.fill('#sq', '')
        parts = pg.evaluate("(()=>{const o=WA_MAX;WA_MAX=150;const p=shareBuild('all');WA_MAX=o;return p})()")
        check('Pesan panjang dibagi bagian (judul bagian i/N, tiap bagian ringkas)', len(parts) > 1 and all(f'(bagian {i+1}/{len(parts)})' in p.split('\n')[0] for i, p in enumerate(parts)) and all(len(p) < 400 for p in parts))
        if not pg.is_visible('#menu'): pg.click('#hb')
        pg.click('#mShare'); pg.wait_for_timeout(100)
        check('Menu → dialog Bagikan terbuka', pg.evaluate("document.querySelector('#sh').open"))
        check('Pesan pendek: tidak ada pemilih "Bagian"', not pg.is_visible('#shParts'))
        pg.evaluate("window.__u=null;window.open=u=>{window.__u=u}"); pg.click('#shSend')
        sent = pg.evaluate("window.__u"); body = pg.input_value('#shText')
        from urllib.parse import unquote
        check('Tombol Kirim membuka wa.me dengan isi pesan', sent and sent.startswith('https://wa.me/?text=') and unquote(sent.split('text=', 1)[1]) == body)
        # --- Form Bagikan: preset, kotak centang, judul, catatan, pemisah, simpan pengaturan ---
        check('Form: preset Ringkas aktif & bawaan sama dengan format lama', pg.evaluate("document.querySelector('#shPre .on').dataset.v")=='ringkas' and 'A1-1 > J01T88 2009' in pg.input_value('#shText') if pg.evaluate("document.querySelector('input[name=shs]:checked').value")=='all' else True)
        pg.check('input[name=shs][value=all]'); pg.wait_for_timeout(60)
        pg.click('#shPre [data-v=lengkap]'); pg.wait_for_timeout(60)
        t = pg.input_value('#shText')
        check('Preset Lengkap: 6 kolom dipisah " | "', any(l.count(' | ')==5 for l in t.split('\n')) and all(pg.is_checked(f'#shFlds [data-f={k}]') for k in ['idrak','lot','model','style','spk','qty']))
        pg.uncheck('#shFlds [data-f=style]'); pg.uncheck('#shFlds [data-f=spk]'); pg.wait_for_timeout(60)
        check('Kotak centang Style/SPK dimatikan -> 4 kolom', any(l.count(' | ')==3 for l in pg.input_value('#shText').split('\n')))
        pg.click('#shSep [data-v="-"]'); pg.wait_for_timeout(60)
        check('Pemisah " - " dipakai', any(' - ' in l and ' | ' not in l for l in pg.input_value('#shText').split('\n')))
        pg.fill('#shTitle', 'Laporan pagi'); pg.fill('#shMemo', 'Cek rak A1-2'); pg.wait_for_timeout(60)
        t = pg.input_value('#shText'); L = t.split('\n')
        check('Judul di baris ke-2, catatan di akhir', L[0].startswith('*📦') and L[1]=='Laporan pagi' and t.rstrip().endswith('📝 Cek rak A1-2'))
        pg.click('#shPre [data-v=tabel]'); pg.wait_for_timeout(60)
        t = pg.input_value('#shText')
        check('Preset Tabel: blok ``` berpasangan', t.count('```')>=2 and t.count('```')%2==0)
        pg.click('#shHd [data-v=none]'); pg.uncheck('#shEmp'); pg.uncheck('#shSum'); pg.wait_for_timeout(60)
        t = pg.input_value('#shText')
        check('Tanpa judul grup, tanpa RAK KOSONG, tanpa ringkasan', '*TD*' not in t and 'RAK KOSONG' not in t and 'model ·' not in t)
        pg.select_option('#shGrp', 'none'); pg.select_option('#shSort', 'rak'); pg.wait_for_timeout(60)
        check('Tanpa kelompok + urut IDRak tidak error', '```' in pg.input_value('#shText'))
        pg.fill('#shMax', '300'); pg.wait_for_timeout(60)
        check('Batas karakter 300 dipakai (WA_MAX)', pg.evaluate("WA_MAX")==300)
        pg.click('#shx'); pg.reload(); pg.wait_for_timeout(300)
        pg.click('#hb'); pg.click('#mShare'); pg.wait_for_timeout(100)
        check('Pilihan form tersimpan setelah muat ulang (Tabel, Tanpa judul, batas 300)', pg.evaluate("document.querySelector('#shPre .on').dataset.v")=='tabel' and pg.evaluate("document.querySelector('#shHd .on').dataset.v")=='none' and pg.input_value('#shMax')=='300' and pg.input_value('#shMemo')=='')
        pg.click('#shReset'); pg.wait_for_timeout(60)
        check('Kembalikan ke bawaan = format lama', pg.evaluate("document.querySelector('#shPre .on').dataset.v")=='ringkas' and 'A1-1 > J01T88 2009' in pg.evaluate("shareBuild('all')[0]"))
        check('Tombol Kirim terlihat di layar (dialog bisa digulir)', pg.evaluate("(()=>{const r=document.querySelector('#shSend').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()"))
        pg.click('#shx'); pg.wait_for_timeout(60)
        check('Tidak ada error JavaScript', not errs)
        b.close()
finally:
    srv.terminate()
sys.exit(1 if fails else 0)
