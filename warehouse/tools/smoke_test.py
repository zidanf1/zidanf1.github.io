"""Uji asap otomatis (Playwright). Supabase dipalsukan, jadi tidak butuh internet/akun.
Pemakaian (dari folder proyek):  python tools/smoke_test.py
Butuh: pip install playwright && playwright install chromium
"""
import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT = 8799

import json, re, datetime
def fake_sb(page, store=None, fail=None):
    """Supabase tiruan yang MENYIMPAN data (upsert & filter updated_at), agar muat ulang halaman = ambil dari 'server'."""
    store = store if store is not None else {'rows': {}, 'items': {}}
    clock = [0]
    def h(r):
        req = r.request; m = re.search(r'/rest/v1/(rows|items)', req.url)
        if not m: return r.fulfill(status=200, content_type='application/json', body='[]')
        t = m.group(1); key = 'id' if t == 'rows' else 'lotcode'
        if req.method == 'POST':
            if fail and fail[0]: return r.fulfill(status=500, body='boom')
            for row in json.loads(req.post_data):
                clock[0] += 1; row['updated_at'] = (datetime.datetime(2030,1,1) + datetime.timedelta(seconds=clock[0])).isoformat() + 'Z'
                old = store[t].get(row[key], {}); store[t][row[key]] = {**old, **row}
            return r.fulfill(status=201, body='')
        g = re.search(r'updated_at=gt\.([^&]+)', req.url); since = __import__('urllib.parse').parse.unquote(g.group(1)) if g else ''
        rows = [v for v in store[t].values() if v['updated_at'] > since]
        off = int((re.search(r'offset=(\d+)', req.url) or [0, 0])[1]); return r.fulfill(status=200, content_type='application/json', body=json.dumps(rows[off:off+1000]))
    page.route('**/*.supabase.co/**', h); return store
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); fails = []
def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok: fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        SRV1 = fake_sb(pg)
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
        pg.click('#shx'); pg.wait_for_timeout(60)
        # --- templat format yang bisa diatur sendiri ---
        check('Templat: baris dengan kata kunci kosong dibuang; kata kunci tak dikenal terdeteksi',
              pg.evaluate("tpl('A\\n{cari}\\nB',{cari:''})") == 'A\nB' and pg.evaluate("unknownKeys('{foo} {idrak} {Bar}',['idrak'])") == ['foo', 'Bar'])
        txt = pg.evaluate("(()=>{SHT={...SH_DEF,mode:'tpl',row:'{lotcode} @ {idrak} x{qty}',by:'lot',grp:'*LOT {lotcode}* · {qty}',sort:'rak'};return shareBuild('all')[0]})()")
        check('Templat kustom: kelompok per lotcode, baris & urutan sesuai templat', '*LOT J01T88* · 2009\nJ01T88 @ A1-1 x2009\nJ01T88 @ A2-1 x2009' in txt)
        txt = pg.evaluate("(()=>{SHT={...SH_DEF,by:'none',sort:'qtyd'};return shareBuild('all')[0]})()")
        body = txt.split('\n\n')[1]
        check('Tanpa kelompok + urut Qty besar→kecil', '*TD*' not in txt and body.splitlines()[0].endswith(' 2009'))
        txt = pg.evaluate("(()=>{SHT={...SH_DEF,emp:false};return shareBuild('all')[0]})()")
        check('Rak kosong bisa dimatikan', 'RAK KOSONG' not in txt)
        pg.evaluate("SHT={...SH_DEF}")
        if not pg.is_visible('#menu'): pg.click('#hb')
        pg.click('#mShare'); pg.click('#shFmtBtn'); pg.click('#mdTpl'); pg.wait_for_timeout(100)
        check('Atur format: panel terbuka', pg.is_visible('#shFmt') and pg.is_visible('#tRow'))
        pg.fill('#tRow', '{idrak} => {lotcode}'); pg.wait_for_timeout(100)
        check('Mengubah templat langsung memperbarui pratinjau', 'A1-1 => J01T88' in pg.input_value('#shText'))
        pg.fill('#tRow', 'X '); pg.click('#tRow'); pg.keyboard.press('End'); pg.click('#tChips [data-k="{qty}"]'); pg.wait_for_timeout(100)
        check('Mengetuk kata kunci menyisipkannya ke kolom yang aktif', pg.input_value('#tRow') == 'X {qty}')
        pg.fill('#tRow', '{idrak} {ngawur}'); pg.wait_for_timeout(80)
        check('Peringatan untuk kata kunci tidak dikenal', 'ngawur' in pg.inner_text('#tWarn'))
        pg.fill('#tRow', '{idrak} => {lotcode}'); pg.wait_for_timeout(80)
        pg.reload(); pg.wait_for_timeout(500); pg.click('#hb'); pg.click('#mShare'); pg.wait_for_timeout(100)
        check('Templat tersimpan setelah muat ulang', pg.input_value('#tRow') == '{idrak} => {lotcode}' and 'A1-1 => J01T88' in pg.input_value('#shText'))
        pg.click('#shFmtBtn'); pg.click('#tReset'); pg.wait_for_timeout(100)
        check('Kembalikan bawaan', pg.input_value('#tRow') == '{idrak} > {lotcode} {qty}' and 'A1-1 > J01T88 2009' in pg.input_value('#shText'))
        pg.click('#shx'); pg.wait_for_timeout(60)
        # --- mode Formulir (sederhana), setara dengan templat ---
        check('Formulir bawaan setara format bawaan (deriveTpl == SH_DEF)', pg.evaluate("(()=>{const d=deriveTpl(SHF_DEF,'model');return ['head','grp','row','empH','empR'].every(k=>d[k]===SH_DEF[k])})()"))
        import re as _re
        def open_fmt():
            if not pg.is_visible('#menu'): pg.click('#hb')
            pg.click('#mShare'); pg.wait_for_timeout(80)
            if not pg.is_visible('#shFmt'): pg.click('#shFmtBtn')
            pg.wait_for_timeout(60)
        open_fmt()
        check('Mode Formulir tampil secara bawaan (templat tersembunyi)', pg.is_visible('#fTitle') and not pg.is_visible('#tRow'))
        pg.fill('#fTitle', 'STOK GUDANG'); pg.wait_for_timeout(60)
        check('Formulir: judul pesan', pg.input_value('#shText').splitlines()[0] == '*STOK GUDANG*')
        pg.uncheck('#fDate'); pg.wait_for_timeout(60)
        check('Formulir: tanggal & jam bisa dimatikan', not _re.search(r'\d{2}/\d{2}/\d{4}', pg.input_value('#shText')))
        pg.select_option('#fSep1', ' · '); pg.wait_for_timeout(60)
        check('Formulir: pemisah setelah kolom pertama', 'A1-1 · J01T88 2009' in pg.input_value('#shText'))
        pg.select_option('#shBy', 'lot'); pg.fill('#fPre', 'LOT '); pg.wait_for_timeout(60)
        check('Formulir: kelompok per lotcode + teks sebelum nama kelompok; kolom kelompok tidak diulang', '*LOT J01T88*' in pg.input_value('#shText') and 'A1-1 · 2009' in pg.input_value('#shText'))
        pg.click('#fCols [data-c=qty].cn'); pg.wait_for_timeout(60)
        check('Formulir: kolom bisa disembunyikan', '*LOT J01T88*\nA1-1\nA2-1' in pg.input_value('#shText'))
        pg.click('#fCols [data-c=qty].cn'); pg.check('#fLabel'); pg.click('#fCols [data-mv="-1"][data-c=qty]'); pg.wait_for_timeout(60)
        check('Formulir: label kolom & urutan kolom (▲▼)', 'Qty 2009 · A1-1' in pg.input_value('#shText'))
        pg.click('#shx'); pg.reload(); pg.wait_for_timeout(500); open_fmt()
        check('Pengaturan Formulir tersimpan setelah muat ulang', pg.input_value('#fTitle') == 'STOK GUDANG' and pg.input_value('#shBy') == 'lot')
        pg.click('#mdTpl'); pg.click('#tFromForm'); pg.wait_for_timeout(60)
        check('Templat: "Salin dari pengaturan Formulir"', pg.input_value('#tRow') == 'Qty {qty} · {idrak}' and pg.is_visible('#tRow') and not pg.is_visible('#fTitle'))
        pg.click('#tReset'); pg.wait_for_timeout(60)
        check('Kembalikan bawaan: kembali ke Formulir dengan nilai awal', pg.is_visible('#fTitle') and pg.input_value('#fTitle') == '📦 WAREHOUSE – MAPS' and pg.input_value('#shText').splitlines()[0] == '*📦 WAREHOUSE – MAPS*')
        pg.click('#shx'); pg.wait_for_timeout(60)
        # freeze navbar + header tabel saat scroll
        for i in range(1, 9): add('B2-%d' % i, '')
        pg.set_viewport_size({'width': 420, 'height': 500}); pg.wait_for_timeout(150)
        pg.evaluate('window.scrollTo(0, 400)'); pg.wait_for_timeout(150)
        tp = pg.evaluate("document.querySelector('.top').getBoundingClientRect().top")
        th = pg.evaluate("(()=>{const t=document.querySelector('.top').getBoundingClientRect(),h=document.querySelector('#th th').getBoundingClientRect();return [Math.round(h.top-t.bottom),Math.round(h.top)]})()")
        check('Freeze: navbar tetap di atas saat scroll', tp == 0)
        check('Freeze: baris header tabel menempel tepat di bawah navbar saat scroll', th[0] == 0 and th[1] > 0)

        # --- Versi 28: urutan (select) + realtime & notifikasi baris (WebSocket dipalsukan) ---
        FAKE = """(()=>{class W{constructor(u){this.url=u;this.readyState=1;window.__ws=this;this.sent=[];setTimeout(()=>{this.onopen&&this.onopen();},20)}
          send(m){const d=JSON.parse(m);this.sent.push(d);if(d.event==='phx_join')setTimeout(()=>this.onmessage({data:JSON.stringify({topic:d.topic,event:'phx_reply',payload:{status:'ok'},ref:d.ref})}),20)}
          close(){this.readyState=3;this.onclose&&this.onclose()}}
          window.WebSocket=W;window.__push=(table,record)=>window.__ws.onmessage({data:JSON.stringify({topic:'realtime:wh',event:'postgres_changes',payload:{data:{type:'UPDATE',table,record}}})})})()"""
        p2 = b.new_context().new_page(); errs2 = []
        p2.on('pageerror', lambda e: errs2.append(str(e)))
        SRV2 = fake_sb(p2)
        p2.add_init_script(FAKE)
        p2.goto(f'http://localhost:{PORT}/index.html'); p2.wait_for_timeout(700)
        def add2(rak, lot, m='', q=''):
            p2.click('#add'); p2.select_option('#rak', rak)
            if lot: p2.fill('#q', lot); p2.fill('#fModel', m); p2.fill('#fQty', q)
            p2.click('#dg .btn.b'); p2.wait_for_timeout(250)
        add2('A1-10' if False else 'B1-1', 'ZZ9', 'm1', '5'); add2('A1-2', 'AA1', 'm2', '7'); add2('A1-1', '')
        rows = lambda: p2.eval_on_selector_all('#tb tr', 'e=>e.map(x=>x.firstChild.textContent)')
        check('Select urutan: bawaan Per IDRak (A1-1, A1-2, B1-1)', rows() == ['A1-1', 'A1-2', 'B1-1'])
        check('Select urutan hanya 2 pilihan: IDRak & Lotcode', p2.eval_on_selector_all('#sortSel option', 'e=>e.map(x=>x.textContent)') == ['Per IDRak', 'Per Lotcode'])
        p2.select_option('#sortSel', 'lot'); p2.wait_for_timeout(100)
        check('Per Lotcode: AA1, ZZ9, lalu rak kosong di akhir', rows() == ['A1-2', 'B1-1', 'A1-1'])
        bw = p2.eval_on_selector_all('#tb tr', 'e=>e.map(x=>getComputedStyle(x.firstChild).borderBottomWidth)')
        check('Per Lotcode: garis tebal saat lotcode berganti', bw == ['3px', '3px', '3px'])
        p2.reload(); p2.wait_for_timeout(700)
        check('Pilihan urutan tersimpan setelah muat ulang', p2.input_value('#sortSel') == 'lot')
        p2.select_option('#sortSel', 'rak'); p2.click('#sortDir'); p2.wait_for_timeout(100)
        check('Tombol arah: IDRak turun', rows() == ['B1-1', 'A1-2', 'A1-1']); p2.click('#sortDir'); p2.wait_for_timeout(100)
        check('Realtime: indikator \"Live\" & berlangganan tabel rows+items', 'Live' in p2.inner_text('#live') and
              [c['table'] for c in p2.evaluate("__ws.sent.find(x=>x.event==='phx_join').payload.config.postgres_changes")] == ['rows', 'items'])
        info = p2.evaluate("(()=>{const m=M.find(x=>x.idrak==='A1-2');return {id:m.id,lot:m.lotcode,u:m.updated_at}})()")
        p2.evaluate("([i,l])=>__push('rows',{id:i,idrak:'A1-2',lotcode:l,deleted:false,updated_at:'2099-01-01T00:00:00Z'})", [info['id'], info['lot']]); p2.wait_for_timeout(500)
        check('Gema perubahan sendiri (data sama) tidak memunculkan notifikasi', p2.locator('.toast').count() == 0)
        p2.evaluate("([i])=>__push('rows',{id:i,idrak:'A1-2',lotcode:'ZZ9',deleted:false,updated_at:'2099-01-02T00:00:00Z'})", [info['id']]); p2.wait_for_timeout(500)
        t = p2.locator('.toast').all_text_contents()
        check('Baris berubah dari perangkat lain: langsung berubah di tabel', 'ZZ9' in p2.inner_text('#tb tr:nth-child(2)'))
        check('Notifikasi \"Baris x dengan IDRak A1-2 sudah diperbarui\"', len(t) == 1 and __import__('re').fullmatch(r'Baris \d+ dengan IDRak A1-2 sudah diperbarui', t[0]) is not None)
        check('Baris yang berubah diberi sorotan sementara', p2.locator('#tb tr.hl').count() == 1)
        p2.wait_for_timeout(6500)
        check('Notifikasi hilang sendiri & sorotan padam', p2.locator('.toast').count() == 0 and p2.locator('#tb tr.hl').count() == 0)
        p2.evaluate("__push('items',{lotcode:'ZZ9',model:'M1',style:null,spk:null,qty:99,deleted:false,updated_at:'2099-01-03T00:00:00Z'})"); p2.wait_for_timeout(500)
        t = p2.locator('.toast').all_text_contents()
        check('Qty lot berubah: tiap baris pemakai lot diberi notifikasi (2 baris)', len(t) == 2 and all('sudah diperbarui' in x for x in t) and '99' in p2.inner_text('#tb'))
        p2.evaluate("([i])=>__push('rows',{id:i,idrak:'A1-2',lotcode:'ZZ9',deleted:true,updated_at:'2099-01-04T00:00:00Z'})", [info['id']]); p2.wait_for_timeout(500)
        check('Baris dihapus perangkat lain: hilang & ada notifikasi \"dihapus\"', 'A1-2' not in p2.inner_text('#tb') and any('IDRak A1-2 sudah dihapus' in x for x in p2.locator('.toast').all_text_contents()))
        p2.evaluate("__push('rows',{id:'11111111-1111-1111-1111-111111111111',idrak:'A5-5',lotcode:null,deleted:false,updated_at:'2099-01-05T00:00:00Z'})"); p2.wait_for_timeout(500)
        check('Baris baru dari perangkat lain: tampil + notifikasi \"ditambahkan\"', 'A5-5' in p2.inner_text('#tb') and any('IDRak A5-5 sudah ditambahkan' in x for x in p2.locator('.toast').all_text_contents()))
        p2.evaluate("__ws.close()"); p2.wait_for_timeout(200)
        check('Koneksi putus: indikator \"Terputus\" (polling cadangan jalan)', 'Terputus' in p2.inner_text('#live'))
        check('Tidak ada error JavaScript (realtime)', not errs2)
        p2.screenshot(path='/tmp/shot_rt.png')

        # --- Versi 29: 100% online (tanpa IndexedDB) ---
        dbs = lambda pgx: pgx.evaluate("indexedDB.databases().then(d=>d.map(x=>x.name))")
        check('Online: tidak ada IndexedDB \"warehouse\" yang dibuat/disimpan', 'warehouse' not in dbs(p2))
        check('Online: data tersimpan di Supabase (tiruan), bukan di perangkat', sorted(v['idrak'] for v in SRV2['rows'].values()) == ['A1-1', 'A1-2', 'B1-1'])
        n_before = len(SRV2['rows'])
        p2.reload(); p2.wait_for_timeout(800)
        check('Online: setelah muat ulang, tabel diisi dari server', p2.locator('#tb tr').count() >= 2)
        FAILF = [True]; SRV2f = None
        p2.unroute('**/*.supabase.co/**'); fail = [True]; fake_sb(p2, SRV2, fail)
        p2.click('#add'); p2.select_option('#rak', '__new'); p2.fill('#rakNew', 'C9-9'); p2.click('#dg .btn.b'); p2.wait_for_timeout(900)
        check('Gagal simpan ke server: ada pesan & baris dibatalkan (tidak tersisa di layar)', 'C9-9' not in p2.inner_text('#tb') and any('dibatalkan' in x for x in p2.locator('.toast').all_text_contents()))
        fail[0] = False; p2.wait_for_timeout(300)
        p2.context.set_offline(True)
        p2.click('#add'); p2.select_option('#rak', '__new'); p2.fill('#rakNew', 'D9-9'); p2.click('#dg .btn.b'); p2.wait_for_timeout(300)
        check('Offline: tidak menyimpan, tampil pesan \"Tidak ada koneksi\"', 'D9-9' not in p2.inner_text('#tb') and any('Tidak ada koneksi' in x for x in p2.locator('.toast').all_text_contents()) and p2.is_visible('#dg'))
        p2.context.set_offline(False)
        # IndexedDB lama: perubahan belum terkirim diunggah dulu, lalu DB dihapus
        ctx3 = b.new_context(); p3 = ctx3.new_page(); SRV3 = fake_sb(p3)
        p3.goto(f'http://localhost:{PORT}/manifest.json')
        p3.evaluate("""new Promise(ok=>{const r=indexedDB.open('warehouse',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('maps',{keyPath:'id'});d.createObjectStore('items',{keyPath:'lotcode'});d.createObjectStore('meta',{keyPath:'k'})};
          r.onsuccess=()=>{const t=r.result.transaction(['maps','items'],'readwrite');t.objectStore('maps').put({id:'22222222-2222-2222-2222-222222222222',idrak:'Z9-9',lotcode:'',dirty:1,updated_at:'2020-01-01T00:00:00Z'});
            t.objectStore('maps').put({id:'33333333-3333-3333-3333-333333333333',idrak:'Y1-1',lotcode:'',dirty:0,updated_at:'2020-01-01T00:00:00Z'});t.oncomplete=()=>{r.result.close();ok()}}})""")
        check('IndexedDB lama (uji) ada sebelum aplikasi dibuka', 'warehouse' in dbs(p3))
        p3.goto(f'http://localhost:{PORT}/index.html'); p3.wait_for_timeout(1500)
        check('IndexedDB lama dihapus', 'warehouse' not in dbs(p3))
        check('Perubahan lama yang belum terkirim diunggah ke server dulu (yang sudah terkirim tidak)', '22222222-2222-2222-2222-222222222222' in SRV3['rows'] and '33333333-3333-3333-3333-333333333333' not in SRV3['rows'])
        check('Baris yang diunggah tampil dari server', 'Z9-9' in p3.inner_text('#tb'))
        ctx3.close()
        pg.evaluate('window.scrollTo(0, 0)')
        check('Tidak ada error JavaScript', not errs)
        b.close()
finally:
    srv.terminate()
sys.exit(1 if fails else 0)
