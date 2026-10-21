window.WH_VER='31';
function whFix(msg){var ok=false;try{ok=sessionStorage.getItem('wh_fix')}catch(e){}
 if(!ok){try{sessionStorage.setItem('wh_fix','1')}catch(e){}
  Promise.all([navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}):0,window.caches?caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}):0]).then(function(){location.reload()},function(){location.reload()});return}
 var d=document.createElement('div');d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99;background:#b3261e;color:#fff;padding:10px 14px;font:14px sans-serif';d.textContent=msg;document.body.appendChild(d)}
{const mv=document.querySelector('meta[name=app-version]');if(!mv||mv.content!==window.WH_VER){whFix('index.html tidak sama versinya dengan app.js. Ganti keduanya dengan isi warehouse-final.zip terbaru, lalu tekan Ctrl+Shift+R.');throw new Error('versi index.html berbeda')}}
// Konfigurasi Supabase (publishable key aman di klien; JANGAN pakai secret key)
const CFG={SUPABASE_URL:'https://csgmhwkvrfhabltzdghr.supabase.co',SUPABASE_KEY:'sb_publishable_12S0lYl1jgu_p554JwEsHg_zFnx5G7X'};
// klien Supabase ringan (tanpa library, hanya fetch)
const mkSb=()=>{
 const U=CFG.SUPABASE_URL.replace(/\/$/,''),K=CFG.SUPABASE_KEY,H={apikey:K,'Content-Type':'application/json'};
 return{from:t=>({
  upsert:async(rows,o)=>{const r=await fetch(U+'/rest/v1/'+t+'?on_conflict='+o.onConflict,{method:'POST',headers:{...H,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});return{error:r.ok?null:{message:await r.text()}}},
  select:()=>({gt:async(c,v)=>{let out=[],o=0;for(;;){const r=await fetch(U+'/rest/v1/'+t+'?select=*&order='+c+'.asc&'+c+'=gt.'+encodeURIComponent(v)+'&limit=1000&offset='+o,{headers:H});
    if(!r.ok)return{error:{message:await r.text()}};const d=await r.json();out=out.concat(d);if(d.length<1000)return{data:out};o+=1000}}})
 })}};
const $=s=>document.querySelector(s),CF=CFG;
const sb=(CF.SUPABASE_URL&&CF.SUPABASE_KEY)?mkSb():null;
// ---- Data: 100% online (V29) ----
// Sumber data satu-satunya = Supabase. Tidak ada penyimpanan lokal permanen: MEM hanya cache di memori halaman ini
// dan hilang saat halaman ditutup. Perubahan dikirim ke Supabase seketika; bila gagal, perubahan dibatalkan.
const MEM={rows:new Map,items:new Map,meta:{}};
const all=async s=>[...MEM[s].values()],get=async(s,k)=>MEM[s].get(k),put=async(s,v)=>{MEM[s].set(s==='rows'?v.id:v.lotcode,v)};
const setMeta=async(k,v)=>{MEM.meta[k]=v},getMeta=async k=>MEM.meta[k];
// Sekali jalan: IndexedDB lama (V1-V28) dihapus. Perubahan lama yang belum sempat terkirim diunggah dulu; bila gagal, DB dibiarkan & dicoba lagi saat dibuka berikutnya.
async function purgeOldDB(){
 try{
  const old=await new Promise(ok=>{const r=indexedDB.open('warehouse');r.onupgradeneeded=()=>r.transaction.abort();r.onsuccess=()=>ok(r.result);r.onerror=()=>ok(null);r.onblocked=()=>ok(null)});
  if(!old){indexedDB.deleteDatabase('warehouse');return}
  let dm=[],di=[];
  if(old.objectStoreNames.contains('maps')&&old.objectStoreNames.contains('items')){
   const rd=s=>new Promise((ok,no)=>{const q=old.transaction(s).objectStore(s).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
   dm=(await rd('maps')).filter(x=>x.dirty);di=(await rd('items')).filter(x=>x.dirty)}
  if((dm.length||di.length)){
   if(!sb||!navigator.onLine){old.close();return}
   if(di.length){const {error}=await sb.from('items').upsert(di.map(r=>({lotcode:r.lotcode,model:r.model,style:r.style,spk:r.spk,qty:r.qty,deleted:!!r.deleted})),{onConflict:'lotcode'});if(error){old.close();return}}
   if(dm.length){const {error}=await sb.from('rows').upsert(dm.map(r=>({id:r.id,idrak:r.idrak,lotcode:r.lotcode||null,deleted:!!r.deleted})),{onConflict:'id'});if(error){old.close();return}}
   setTimeout(()=>toast((dm.length+di.length)+' perubahan lama yang belum terkirim sudah diunggah ke server'),1500)}
  old.close();indexedDB.deleteDatabase('warehouse');
 }catch(e){console.error(e)}
}
// ---- State & render ----
let FLASH=new Set,M=[],I={},sort=1,cur=null,ROWS=[],SORTM='rak';
try{const s=JSON.parse(localStorage.getItem('wh_sort')||'{}');if(s.m==='lot')SORTM='lot';if(s.d===-1)sort=-1}catch{}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nat=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
const p2=n=>String(n).padStart(2,'0');
const fmt=d=>d.toLocaleDateString('id-ID',{weekday:'long'})+', '+p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+d.getFullYear()+' '+p2(d.getHours())+':'+p2(d.getMinutes());
async function load(){
 M=(await all('rows')).filter(x=>!x.deleted);
 I=Object.fromEntries((await all('items')).filter(x=>!x.deleted).map(x=>[x.lotcode,x]));
 const u=await getMeta('upd');$('#upd').textContent='Update: '+fmt(u?new Date(u):new Date());
 render();pend();
}
function render(){
 const q=($('#sq').value||'').trim().toUpperCase(),tk=q?q.split(/\s+/):[];
 const fld=m=>{const it=I[m.lotcode]||{};return [m.idrak,m.lotcode||'KOSONG',it.model,it.style,it.spk,it.qty].map(x=>String(x??'').toUpperCase())};
 const F=M.map(fld);   // bidang tiap baris, huruf besar
 // kata kunci yang sama persis dengan suatu nilai (mis. rak A1-1) hanya cocok persis, agar A1-1 tidak ikut menampilkan A1-10
 const exact=tk.map(t=>F.some(f=>f.includes(t)));
 let r=tk.length?M.filter((m,i)=>tk.every((t,k)=>exact[k]?F[i].includes(t):F[i].some(v=>v.includes(t)))):M.slice();
 $('#sx').hidden=!q;VIS=r;   // baris yang sedang tampil (dipakai fitur bagikan)
 $('#cnt').textContent=q?`${r.length} dari ${M.length} baris`:`${M.length} baris`;
 $('#emp').textContent=q?'Tidak ada hasil untuk “'+q+'”.':'Belum ada data. Tekan + Baris untuk menambah.';
 const ord=m=>m.created||m.updated_at||'';
 const byL=(a,b)=>!a.lotcode&&!b.lotcode?0:!a.lotcode?1:!b.lotcode?-1:nat(a.lotcode,b.lotcode);   // rak kosong di akhir
 r.sort(SORTM==='lot'?(a,b)=>sort*byL(a,b)||nat(a.idrak,b.idrak):(a,b)=>sort*nat(a.idrak,b.idrak)||ord(a).localeCompare(ord(b)));ROWS=r;
 $('#sortSel').value=SORTM;$('#sortDir').textContent=sort===1?'↑':'↓';
 const cols=SET.order.filter(c=>c==='lotcode'||SET.cols.includes(c));   // Lotcode selalu tampil; urutan sesuai pengaturan pengguna (bawaan: Lotcode paling depan)
 $('#th').innerHTML='<tr><th>IDRak</th>'+cols.map(c=>`<th${c==='lotcode'?' class="lc"':''}>${CL[c]}</th>`).join('')+'</tr>';
 const rk=SORTM==='lot'?(id,m)=>m.lotcode||'':id=>String(id).split('-')[0];   // mode IDRak: 'A1-3' -> rak 'A1'; mode Lotcode: garis tebal saat lotcode berganti
 $('#tb').innerHTML=r.map((m,i)=>{const it=I[m.lotcode];
  return `<tr data-id="${m.id}" class="${FLASH.has(m.id)?'hl ':''}${i===r.length-1||rk(r[i+1].idrak,r[i+1])!==rk(m.idrak,m)?'ge':''}"><td>${esc(m.idrak)}</td>`+cols.map(c=>c==='lotcode'?`<td class="lc">${m.lotcode?`<span class="lt" title="${esc(m.lotcode)}">${esc(m.lotcode)}</span>`:'<span class="kos">● kosong</span>'}</td>`:`<td>${it&&(c==='qty'||it[c])?(c==='qty'?esc(it[c]):`<span class="cx" title="${esc(it[c])}">${esc(it[c])}</span>`):'-'}</td>`).join('')+'</tr>'}).join('');
 $('#emp').hidden=r.length>0;
}
$('#sq').addEventListener('input',()=>render());
$('#sx').onclick=()=>{$('#sq').value='';render();$('#sq').focus()};
$('#sq').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sq').value='';render()}});
// ?q=... di URL mengisi kotak cari (mis. index.html?q=A1-1)
{const uq=new URLSearchParams(location.search).get('q');if(uq){$('#sq').value=uq.toUpperCase();render()}}
const sortSave=()=>{try{localStorage.setItem('wh_sort',JSON.stringify({m:SORTM,d:sort}))}catch{}};
$('#sortSel').onchange=e=>{SORTM=e.target.value;sortSave();render()};
$('#sortDir').onclick=()=>{sort=-sort;sortSave();render()};
// ---- Form tambah / ubah ----
let flt='',editLot=false,lastV=null,wasNew=false,forceNew=false;
// Lot baru hanya diusulkan kalau TIDAK ada lotcode yang sama/mirip; kalau memang mau membuat lot baru yang mirip, tekan Enter
const similar=v=>Object.keys(I).some(k=>k.includes(v));
const newOk=v=>!!v&&!I[v]&&(forceNew||!similar(v));
const setLotF=it=>{$('#fModel').value=it?.model||'';$('#fStyle').value=it?.style||'';$('#fSpk').value=it?.spk||'';$('#fQty').value=it?.qty??''};
const RAKS=[...['A','B'].flatMap(z=>Array.from({length:10},(_,i)=>i+1).flatMap(r=>Array.from({length:8},(_,k)=>z+r+'-'+(k+1)))),'STG']; // zona A/B x rak 1-10 x kolom 1-8, + STG (staging)
function fillRak(sel){const r=[...new Set(RAKS.concat(M.map(m=>m.idrak),sel?[sel]:[]))].sort(nat),g={},o=[];
 r.forEach(x=>{const k=x.includes('-')?x.split('-')[0]:'';(g[k]=g[k]||[]).push(x)});
 const opt=x=>`<option>${esc(x)}</option>`;
 for(const k in g)o.push(k?`<optgroup label="Rak ${esc(k)}">${g[k].map(opt).join('')}</optgroup>`:g[k].map(opt).join(''));
 $('#rak').innerHTML=o.join('')+'<option value="__new">+ Rak baru…</option>';
 $('#rak').value=sel||r[0]||'__new';rakChg()}
const rakChg=()=>{$('#rakNew').hidden=$('#rak').value!=='__new'};
$('#rak').onchange=rakChg;
// semua isian teks otomatis HURUF BESAR (dipasang di tingkat dokumen agar selalu jalan lebih dulu)
const UPQ='#q,#rakNew,#fModel,#fStyle,#fSpk,#sq';
const toUp=e=>{const el=e.target;if(!el||!el.matches||!el.matches(UPQ))return;const u=el.value.toUpperCase();if(u===el.value)return;
 const s=el.selectionStart,n=el.selectionEnd;el.value=u;try{el.setSelectionRange(s,n)}catch{}};
['input','change','blur','keyup','paste','compositionend'].forEach(t=>document.addEventListener(t,e=>{t==='paste'?setTimeout(()=>toUp(e),0):toUp(e)},true));
function upd(){
 const v=$('#q').value.trim(),isNew=!!v&&!I[v];
 if(v!==lastV){editLot=false;forceNew=false;lastV=v}
 const nok=newOk(v);$('#lotMsg').hidden=true;
 if(nok&&!wasNew)setLotF(null);wasNew=nok;
 $('#lotf').hidden=!(nok||editLot);$('#editLot').hidden=!v||isNew||editLot;$('#delLot').hidden=!v||isNew;
 const ft=flt.trim(),t=ft.toLowerCase(),keys=Object.keys(I).sort(nat).filter(k=>!t||k.toLowerCase().includes(t));
 let h='';
 if(!t)h+=`<div class="o${v===''?' sel':''}" data-l=""><span>— Kosong (tanpa lotcode) —</span></div>`;
 h+=keys.map(k=>`<div class="o${k===v?' sel':''}" data-l="${esc(k)}"><b>${esc(k)}</b><span>${esc(I[k].model||'-')} · Qty ${esc(I[k].qty)}</span></div>`).join('');
 if(t&&!I[ft]&&(forceNew||!keys.length))h+=`<div class="o${nok&&v===ft?' sel':''}" data-l="${esc(ft)}"><b>+ Lot baru “${esc(ft)}”</b></div>`;
 $('#opts').innerHTML=h}
$('#q').oninput=()=>{flt=$('#q').value;upd()};
$('#q').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const v=$('#q').value.trim();if(v&&!I[v]){forceNew=true;upd()}});
$('#opts').onclick=e=>{const o=e.target.closest('.o');if(!o)return;$('#q').value=o.dataset.l;flt='';upd()};
$('#delLot').onclick=async()=>{const v=$('#q').value.trim(),it=I[v];if(!it||!needNet())return;
 const aff=M.filter(m=>m.lotcode===v);
 if(!confirm('Hapus lotcode '+v+'?'+(aff.length?'\n'+aff.length+' rak yang memakai lot ini akan menjadi kosong.':'')))return;
 const now=new Date().toISOString();
 await put('items',{...it,deleted:true,dirty:1,updated_at:now});
 for(const m of aff)await put('rows',{...m,lotcode:'',dirty:1,updated_at:now});
 $('#dg').close();await changed()};
$('#editLot').onclick=()=>{setLotF(I[$('#q').value.trim()]);editLot=true;upd()};
function openForm(m){cur=m||null;$('#dt').textContent=m?'Ubah Baris':'Tambah Baris';$('#del').hidden=!m;
 fillRak(m?m.idrak:'');$('#rakNew').value='';$('#q').value=m?m.lotcode:'';flt='';editLot=false;forceNew=false;lastV=null;wasNew=false;upd();$('#dg').showModal()}
$('#add').onclick=()=>openForm();$('#cx').onclick=$('#cx2').onclick=()=>$('#dg').close();
$('#tb').onclick=e=>{const tr=e.target.closest('tr');if(tr)openForm(M.find(x=>x.id===tr.dataset.id))};
$('#fm2').onsubmit=async e=>{
 if(!needNet()){e.preventDefault();return}
 const rk=($('#rak').value==='__new'?$('#rakNew').value:$('#rak').value).trim().toUpperCase(),v=$('#q').value.trim().toUpperCase();
 if(!rk){e.preventDefault();$('#rakNew').focus();return}
 {const v0=$('#q').value.trim();if(v0&&!I[v0]&&!newOk(v0)){e.preventDefault();const m=$('#lotMsg');m.textContent='Lotcode “'+v0+'” belum ada. Pilih dari daftar, atau tekan Enter untuk membuat lot baru.';m.hidden=false;return}}
 const now=new Date().toISOString();
 await put('rows',{id:cur?.id||crypto.randomUUID(),idrak:rk,lotcode:v,created:cur?.created||cur?.updated_at||now,updated_at:now,deleted:false,dirty:1});
 if(v&&(!I[v]||editLot))await put('items',{...(I[v]||{}),lotcode:v,model:$('#fModel').value.trim().toUpperCase(),style:$('#fStyle').value.trim().toUpperCase(),spk:$('#fSpk').value.trim().toUpperCase(),qty:+$('#fQty').value||0,updated_at:now,deleted:false,dirty:1});
 await changed();
};
$('#del').onclick=async()=>{if(!cur||!needNet()||!confirm('Hapus baris ini?'))return;
 await put('rows',{...cur,deleted:true,dirty:1,updated_at:new Date().toISOString()});$('#dg').close();await changed()};
async function changed(){await setMeta('upd',new Date().toISOString());await load();await sync(true)}   // kirim seketika; gagal → dibatalkan
const needNet=()=>{if(navigator.onLine)return true;toast('Tidak ada koneksi internet — perubahan tidak disimpan');return false};
// ---- Sinkronisasi Supabase ----
const stat=t=>{const s=$('#st');s.textContent=/^Tersinkron/.test(t)?'':t;s.className=/^Gagal/.test(t)?'err':'';$('#sy').title=t||'Sinkron sekarang'};
async function pend(){const n=(await all('rows')).filter(x=>x.dirty).length+(await all('items')).filter(x=>x.dirty).length;$('#sy').classList.toggle('pend',!!sb&&n>0)}
async function sync(strict){
 if(!sb)return stat('Mode lokal (Supabase belum diisi)');
 if(!navigator.onLine)return stat('Offline');
 try{$('#sy').classList.add('spin');
  const dm=(await all('rows')).filter(x=>x.dirty);
  if(dm.length){const {error}=await sb.from('rows').upsert(dm.map(r=>({id:r.id,idrak:r.idrak,lotcode:r.lotcode||null,deleted:!!r.deleted})),{onConflict:'id'});if(error)throw error;for(const r of dm)await put('rows',{...r,dirty:0})}
  const di=(await all('items')).filter(x=>x.dirty);
  if(di.length){const {error}=await sb.from('items').upsert(di.map(r=>({lotcode:r.lotcode,model:r.model,style:r.style,spk:r.spk,qty:r.qty,deleted:!!r.deleted})),{onConflict:'lotcode'});if(error)throw error;for(const r of di)await put('items',{...r,dirty:0})}
  const since0=await getMeta('since'),since=since0||'1970-01-01T00:00:00Z';let mx=since;const ch=[];
  for(const t of ['rows','items']){const {data,error}=await sb.from(t).select('*').gt('updated_at',since);if(error)throw error;
   for(const r of data){const c=await applyRemote(t,r);if(c)ch.push(c);if(r.updated_at>mx)mx=r.updated_at}}
  await setMeta('since',mx);await setMeta('upd',new Date().toISOString());await load();stat('Tersinkron '+fmt(new Date()));
  if(since0)notify(ch);   // sinkron pertama (data awal) tidak diberi notifikasi
 }catch(e){console.error(e);stat('Gagal sinkron: '+(e.message||e));
  if(strict){toast('Gagal menyimpan ke server, perubahan dibatalkan');MEM.rows.clear();MEM.items.clear();MEM.meta={};$('#sy').classList.remove('spin');return sync()}}   // muat ulang penuh dari server
 $('#sy').classList.remove('spin');net();pend();
}

// ---- Realtime (Supabase Realtime lewat WebSocket, tanpa library) + notifikasi baris ----
// Terapkan satu baris dari server ke cache memori. Mengembalikan deskripsi perubahan bila TAMPILAN berubah (null bila sama / baris lokal belum terkirim).
async function applyRemote(t,r){
 const key=t==='rows'?r.id:r.lotcode;if(!key)return null;
 const l=await get(t,key);if(l?.dirty)return null;   // perubahan lokal belum terkirim tidak ditimpa
 const same=!l?false:t==='rows'?(l.idrak===r.idrak&&(l.lotcode||'')===(r.lotcode||'')&&!!l.deleted===!!r.deleted)
  :(l.model===r.model&&l.style===r.style&&l.spk===r.spk&&Number(l.qty)===Number(r.qty)&&!!l.deleted===!!r.deleted);
 await put(t,{...(l||{}),...r,lotcode:r.lotcode||''});
 if(same)return null;   // gema dari perubahan kita sendiri / tidak ada beda → tanpa notifikasi
 if(t==='rows')return{k:'rows',id:r.id,idrak:r.idrak,kind:r.deleted?(l&&!l.deleted?'del':null):(!l||l.deleted?'add':'upd')};
 return{k:'items',lot:r.lotcode,kind:'upd'};
}
const rowNo=id=>{const i=ROWS.findIndex(m=>m.id===id);return i<0?0:i+1};
function toast(msg){const w=$('#toasts'),d=document.createElement('div');d.className='toast';d.textContent=msg;
 const go=()=>{d.classList.add('out');setTimeout(()=>d.remove(),300)};d.onclick=go;w.appendChild(d);
 while(w.children.length>4)w.firstChild.remove();setTimeout(go,6000)}
function notify(list,prevRows){
 const seen=new Set,items=[];
 for(const c of list){   // perubahan data lot → semua baris rak yang memakai lot itu
  if(c.k==='items'){for(const m of M)if(m.lotcode===c.lot&&!seen.has(m.id)){seen.add(m.id);items.push({id:m.id,idrak:m.idrak,kind:'upd'})}}
  else if(!seen.has(c.id)){seen.add(c.id);items.push(c)}}
 if(!items.length)return;
 for(const c of items.slice(0,3)){
  const n=c.kind==='del'?(prevRows||[]).findIndex(m=>m.id===c.id)+1:rowNo(c.id);
  const verb=c.kind==='add'?'ditambahkan':c.kind==='del'?'dihapus':'diperbarui';
  toast((n?'Baris '+n+' dengan ':'Baris dengan ')+'IDRak '+c.idrak+' sudah '+verb)}
 if(items.length>3)toast('+ '+(items.length-3)+' baris lain juga diperbarui');
 FLASH=new Set(items.filter(c=>c.kind!=='del').map(c=>c.id));render();setTimeout(()=>{FLASH=new Set;document.querySelectorAll('#tb tr.hl').forEach(x=>x.classList.remove('hl'))},3200)}
// perubahan masuk dari WebSocket → gabungkan, muat ulang tampilan, beri notifikasi (dikumpulkan 150 ms agar satu paket)
let RTQ=[];
async function rtApply(t,r){const c=await applyRemote(t,r);if(c)RTQ.push(c);
 clearTimeout(rtApply.t);rtApply.t=setTimeout(async()=>{const q=RTQ;RTQ=[];const prev=ROWS.slice();
  const mx=r.updated_at;if(mx&&mx>(await getMeta('since')||''))await setMeta('since',mx);
  await setMeta('upd',new Date().toISOString());await load();notify(q,prev)},150)}
let ws=null,wsOk=false,wsT=0,wsHb=0;
const liveSet=(on,txt)=>{wsOk=on;const e=$('#live');e.hidden=!sb;e.className='live'+(on?' on':'');e.textContent=txt}
function rtConnect(){
 if(!sb||ws)return;
 try{const u=new URL(CFG.SUPABASE_URL.replace(/\/$/,''));
  ws=new WebSocket('wss://'+u.host+'/realtime/v1/websocket?apikey='+encodeURIComponent(CFG.SUPABASE_KEY)+'&vsn=1.0.0');
  let ref=0;const send=(topic,event,payload)=>ws.send(JSON.stringify({topic,event,payload,ref:String(++ref)}));
  ws.onopen=()=>{liveSet(false,'○ Menyambung…');
   send('realtime:wh','phx_join',{config:{broadcast:{ack:false},presence:{key:''},postgres_changes:['rows','items'].map(table=>({event:'*',schema:'public',table}))}});
   wsHb=setInterval(()=>ws&&ws.readyState===1&&send('phoenix','heartbeat',{}),25000)};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch{return}
   if(m.event==='phx_reply'&&m.topic==='realtime:wh'){if(m.payload?.status==='ok'){liveSet(true,'● Live');sync()}else liveSet(false,'○ Realtime belum aktif')}
   else if(m.event==='postgres_changes'){const d=m.payload?.data;if(d&&d.record&&d.table)rtApply(d.table,d.record)}
   else if(m.event==='phx_error'||m.event==='phx_close')ws&&ws.close()};
  ws.onclose=()=>{clearInterval(wsHb);ws=null;if(wsOk||$('#live').textContent.indexOf('belum aktif')<0)liveSet(false,'○ Terputus');clearTimeout(wsT);wsT=setTimeout(rtConnect,navigator.onLine?4000:15000)};
  ws.onerror=()=>{try{ws&&ws.close()}catch{}};
 }catch(e){console.error(e);ws=null}
}
addEventListener('online',()=>{if(!ws)rtConnect()});
function net(){$('#net').textContent=navigator.onLine?'':'Offline'}
addEventListener('online',()=>{net();sync()});addEventListener('offline',net);
// ---- Pengaturan tema & tampilan (disimpan di perangkat) ----
const SET={theme:'auto',color:'biru',size:'m',dens:'n',cols:['model','qty'],order:['lotcode','spk','qty','model','style']};
const CL={model:'Model',style:'Style',spk:'SPK',lotcode:'Lotcode',qty:'Qty'};
const WARNA={"biru": "Biru", "navy": "Navy", "marun": "Marun", "hijau": "Hijau", "ungu": "Ungu", "oranye": "Oranye", "teal": "Teal", "abu": "Abu-abu"};
try{Object.assign(SET,JSON.parse(localStorage.getItem('wh_set')||'{}'))}catch{}
SET.cols=(Array.isArray(SET.cols)?SET.cols:[]).filter(c=>['model','style','spk','qty'].includes(c)).slice(-2);
if(Array.isArray(SET.order)&&SET.order.length===4&&!SET.order.includes('lotcode'))SET.order=['lotcode',...SET.order];   // migrasi dari versi lama
if(!Array.isArray(SET.order)||SET.order.length!==5||!['lotcode','spk','qty','model','style'].every(c=>SET.order.includes(c)))SET.order=['lotcode','spk','qty','model','style'];
function applySet(){const r=document.documentElement;
 SET.theme==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',SET.theme);
 r.dataset.size=SET.size;r.dataset.dens=SET.dens;
 SET.color==='biru'?r.removeAttribute('data-color'):r.setAttribute('data-color',SET.color);
 const cn=document.getElementById('colName');if(cn)cn.textContent=WARNA[SET.color]||'';
 document.querySelectorAll('#menu .seg,#menu .sw').forEach(g=>g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',SET[g.dataset.key]===b.dataset.v)));
 drawCols();
 try{const tc=document.querySelector('meta[name=theme-color]');if(tc)tc.content=getComputedStyle(r).getPropertyValue('--bl').trim()||'#3d7ab5'}catch{}
 try{localStorage.setItem('wh_set',JSON.stringify(SET))}catch{}}
document.querySelectorAll('#menu .seg button,#menu .sw button').forEach(b=>b.onclick=()=>{SET[b.parentNode.dataset.key]=b.dataset.v;applySet()});
// daftar kolom di menu: centang = tampil (maks. 2), ▲▼ = ubah urutan; Lotcode selalu pertama dan tidak bisa dipindah
function drawCols(){const L=$('#cols');if(!L)return;
 const o=SET.order,vis=c=>c==='lotcode'||SET.cols.includes(c);
 L.innerHTML=o.map((c,i)=>{const on=vis(c),up=on?o.slice(0,i).some(vis):i>0,dn=on?o.slice(i+1).some(vis):i<o.length-1;   // kolom tampil hanya bisa digeser melewati kolom tampil lain
  const lab=c==='lotcode'?'<span class="fix">Lotcode (selalu tampil)</span>':`<button type="button" class="cn${on?' on':''}" data-c="${c}" aria-pressed="${on}">${on?'✓ ':''}${CL[c]}</button>`;
  return `<div class="cr">${lab}<button type="button" class="mv" data-mv="-1" data-c="${c}" aria-label="Geser ${CL[c]} ke atas"${up?'':' disabled'}>▲</button><button type="button" class="mv" data-mv="1" data-c="${c}" aria-label="Geser ${CL[c]} ke bawah"${dn?'':' disabled'}>▼</button></div>`}).join('')}
$('#cols').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const c=b.dataset.c,o=SET.order,vis=x=>x==='lotcode'||SET.cols.includes(x);
 if(b.dataset.mv){const d=Number(b.dataset.mv),i=o.indexOf(c);
  if(vis(c)){let k=i+d;while(k>=0&&k<o.length&&!vis(o[k]))k+=d;if(k<0||k>=o.length)return;o.splice(i,1);o.splice(k,0,c)}   // lompati kolom yang tersembunyi agar tiap ketukan terlihat hasilnya
  else{const k=i+d;if(k<0||k>=o.length)return;[o[i],o[k]]=[o[k],o[i]]}}
 else SET.cols=SET.cols.includes(c)?SET.cols.filter(x=>x!==c):[...SET.cols,c].slice(-2);   // pilih ke-3 menggantikan yang paling lama
 applySet();render()};
applySet();
// ---- Menu ----
const menu=$('#menu');
$('#hb').onclick=()=>{menu.hidden=!menu.hidden};
document.addEventListener('click',e=>{const p=e.composedPath();if(!p.includes(menu)&&!p.includes($('#hb')))menu.hidden=true});   // composedPath: tombol yang digambar ulang tetap dianggap di dalam menu
$('#sy').onclick=()=>sync();
// ---- Bagikan via WhatsApp ----
// Pesan disusun dari TEMPLAT yang bisa diubah pengguna (kata kunci dalam {kurung kurawal}). Bawaan = format "grup per model".
const SH_DEF={head:'*📦 WAREHOUSE – MAPS*\n{tanggal} {jam}\n{cari}\n{ringkasan}',grp:'*{grup}*',row:'{idrak} > {lotcode} {qty}',empH:'*RAK KOSONG*',empR:'{idrak} > kosong',by:'model',sort:'lot',emp:true,mode:'form'};
const SH_KEYS={head:['tanggal','jam','cari','ringkasan','kelompok_n','lot_n','rak_terisi','rak_kosong'],grp:['grup','jumlah','lotcode','qty','model','style','spk'],row:['no','idrak','lotcode','qty','model','style','spk'],empH:['jumlah'],empR:['idrak']};
const SH_BY={model:'Model',style:'Style',spk:'SPK',rak:'Rak',lot:'Lotcode',none:'Tanpa kelompok'};
// Mode "Formulir" (sederhana): tiap isian diterjemahkan menjadi templat oleh deriveTpl(); mode "Templat teks" memakai SHT apa adanya.
const SHF_DEF={title:'📦 WAREHOUSE – MAPS',bold:true,date:true,sum:true,search:true,pre:'',count:false,label:false,sep1:' > ',sep2:' ',empT:'RAK KOSONG',empX:'kosong',order:['idrak','lotcode','qty','model','style','spk'],cols:['idrak','lotcode','qty']};
let SHT={...SH_DEF},SHF={...SHF_DEF};
try{const sv=JSON.parse(localStorage.getItem('wh_share')||'{}');Object.assign(SHT,sv);delete SHT.form;SHF=Object.assign({},SHF_DEF,sv.form||{})}catch{}
if(!Array.isArray(SHF.order)||SHF.order.length!==6||!SHF_DEF.order.every(c=>SHF.order.includes(c)))SHF.order=[...SHF_DEF.order];
SHF.cols=(Array.isArray(SHF.cols)?SHF.cols:SHF_DEF.cols).filter(c=>SHF_DEF.order.includes(c));
const shSave=()=>{try{localStorage.setItem('wh_share',JSON.stringify({...SHT,form:SHF}))}catch{}};
let WA_MAX=1200;   // batas karakter per pesan; lebih dari itu dibagi beberapa bagian (tiap bagian dikirim terpisah)
let VIS=[],shParts=[],shIdx=0;
const p2s=n=>String(n).padStart(2,'0');
const unknownKeys=(s,ok)=>[...new Set([...String(s).matchAll(/\{([A-Za-z_]+)\}/g)].map(m=>m[1]).filter(k=>!ok.includes(k)))];
// isi templat; baris yang berisi kata kunci tetapi hasilnya kosong (mis. {cari} saat tidak mencari) dibuang
function tpl(s,v){return String(s).split('\n').map(l=>{const has=/\{[A-Za-z_]+\}/.test(l),o=l.replace(/\{([A-Za-z_]+)\}/g,(m,k)=>k in v?String(v[k]):m);return has&&!o.trim()?null:o}).filter(x=>x!==null).join('\n')}
function packParts(head,blocks,max){
 const parts=[],title=head.split('\n')[0];let cur=[],len=0,n=0;
 const open=t=>{cur=t?[t]:[];len=t.length;n=0},close=()=>{parts.push(cur.join('\n'))};
 open(head);
 for(const b of blocks){
  let cont=false;
  const gstart=()=>{if(cur.length){cur.push('');len+=1}if(b.h){const hd=b.h+(cont?' (lanjutan)':'');cur.push(hd);len+=hd.length+1}};
  gstart();
  for(const ln of b.lines){
   if(len+ln.length+1>max&&n>0){close();open(title);cont=true;gstart()}   // bagian baru: ulangi baris pertama judul + judul kelompok
   cur.push(ln);len+=ln.length+1;n++;
  }
 }
 close();
 if(parts.length>1)parts.forEach((t,i)=>{const tag=`(bagian ${i+1}/${parts.length})`;parts[i]=title?t.replace(/^[^\n]*/,m=>m+' '+tag):tag+'\n'+t});
 return parts;
}
function deriveTpl(F,by){
 const B=F.bold?'*':'',skip={model:'model',style:'style',spk:'spk',lot:'lotcode'}[by],L={qty:'Qty',model:'Model',style:'Style',spk:'SPK'};
 const cols=F.order.filter(c=>F.cols.includes(c)&&c!==skip),piece=c=>(F.label&&L[c]?L[c]+' ':'')+'{'+c+'}';
 return{head:[F.title?B+F.title+B:'',F.date?'{tanggal} {jam}':'',F.search?'{cari}':'',F.sum?'{ringkasan}':''].filter(Boolean).join('\n'),
  grp:B+F.pre+'{grup}'+B+(F.count?' ({jumlah})':''),
  row:cols.length?piece(cols[0])+(cols.length>1?F.sep1+cols.slice(1).map(piece).join(F.sep2):''):'',
  empH:F.empT?B+F.empT+B:'',empR:'{idrak}'+F.sep1+F.empX};
}
function shareBuild(scope){
 const T=SHT.mode==='tpl'?SHT:{...SHT,...deriveTpl(SHF,SHT.by)},rows=(scope==='all'?M:VIS).slice(),byNat=(a,b)=>nat(String(a),String(b)),rk=id=>String(id).split('-')[0];
 const val=x=>{const s=String(x??'').trim().toUpperCase();return s||'-'};
 const filled=rows.filter(m=>m.lotcode),empty=rows.filter(m=>!m.lotcode);
 const recs=filled.map(m=>{const it=I[m.lotcode]||{};return{idrak:m.idrak,lotcode:m.lotcode,qty:it.qty==null?'-':it.qty,model:val(it.model),style:val(it.style),spk:val(it.spk)}});
 const gkey=r=>T.by==='rak'?rk(r.idrak):T.by==='lot'?r.lotcode:T.by==='none'?'':r[T.by]||'-';
 const NK='(TANPA '+(SH_BY[T.by]||'').toUpperCase()+')',groups={};
 recs.forEach(r=>{let k=gkey(r);if(k==='-')k=NK;(groups[k]=groups[k]||[]).push(r)});
 const cmpLot=(a,b)=>byNat(a.lotcode,b.lotcode)||byNat(a.idrak,b.idrak);
 const cmp={lot:cmpLot,rak:(a,b)=>byNat(a.idrak,b.idrak)||byNat(a.lotcode,b.lotcode),qty:(a,b)=>(Number(a.qty)||0)-(Number(b.qty)||0)||cmpLot(a,b),qtyd:(a,b)=>(Number(b.qty)||0)-(Number(a.qty)||0)||cmpLot(a,b)}[T.sort]||cmpLot;
 const names=Object.keys(groups).sort((a,b)=>a===NK?1:b===NK?-1:byNat(a,b));
 const blocks=names.map(n=>{const g=groups[n].sort(cmp),f=g[0];
  return{h:T.by==='none'?'':tpl(T.grp,{grup:n,jumlah:g.length,lotcode:f.lotcode,qty:f.qty,model:f.model,style:f.style,spk:f.spk}),lines:g.map((r,i)=>tpl(T.row,{no:i+1,...r}))}});
 const fSet=new Set(filled.map(m=>m.idrak)),eList=[...new Set(empty.map(m=>m.idrak))].filter(i=>!fSet.has(i)).sort(byNat);
 if(T.emp&&eList.length)blocks.push({h:tpl(T.empH,{jumlah:eList.length}),lines:eList.map(i=>tpl(T.empR,{idrak:i}))});
 const d=new Date(),q=scope==='all'?'':($('#sq').value||'').trim().toUpperCase(),nLot=new Set(filled.map(m=>m.lotcode)).size;
 const showK=!['none','lot'].includes(T.by);
 const ringkasan=(showK?`${names.length} ${(SH_BY[T.by]||'').toLowerCase()} · `:'')+`${nLot} lot · ${fSet.size} rak terisi · ${eList.length} rak kosong`;
 const head=tpl(T.head,{tanggal:`${p2s(d.getDate())}/${p2s(d.getMonth()+1)}/${d.getFullYear()}`,jam:`${p2s(d.getHours())}:${p2s(d.getMinutes())}`,cari:q?'🔎 Pencarian: '+q:'',ringkasan,kelompok_n:names.length,lot_n:nLot,rak_terisi:fSet.size,rak_kosong:eList.length});
 return blocks.length?packParts(head,blocks,WA_MAX):[(head?head+'\n\n':'')+'(tidak ada data)'];
}
function shShow(){const n=shParts.length,bx=$('#shParts');
 bx.hidden=n<2;bx.innerHTML=shParts.map((_,i)=>`<button type="button" data-i="${i}" class="${i===shIdx?'on':''}">Bagian ${i+1}</button>`).join('');
 $('#shText').value=shParts[shIdx];
 $('#shNote').textContent=n>1?`Pesan panjang dibagi ${n} bagian (±${WA_MAX} karakter). Kirim satu per satu.`:shParts[0].length+' karakter';
 $('#shSend').textContent=n>1?`Kirim bagian ${shIdx+1} ke WhatsApp`:'Kirim ke WhatsApp'}
function shRebuild(){shParts=shareBuild(document.querySelector('input[name=shs]:checked').value);shIdx=0;shShow()}
// --- editor format: mode Formulir (sederhana) atau Templat teks (lanjutan) ---
const TF={head:'#tHead',grp:'#tGrp',row:'#tRow',empH:'#tEmpH',empR:'#tEmpR'};let tFocus='row';
const FT={title:'#fTitle',pre:'#fPre',empT:'#fEmpT',empX:'#fEmpX'},FB={bold:'#fBold',date:'#fDate',sum:'#fSum',search:'#fSearch',count:'#fCount',label:'#fLabel'},FS={sep1:'#fSep1',sep2:'#fSep2'};
const FL={idrak:'IDRak',lotcode:'Lotcode',qty:'Qty',model:'Model',style:'Style',spk:'SPK'};
function drawChips(){$('#tChips').innerHTML=SH_KEYS[tFocus].map(x=>`<button type="button" data-k="{${x}}">{${x}}</button>`).join('')}
const fSkip=()=>({model:'model',style:'style',spk:'spk',lot:'lotcode'})[SHT.by];   // kolom yang sudah jadi judul kelompok tidak diulang di baris
function drawFCols(){const o=SHF.order,sk=fSkip(),vis=c=>SHF.cols.includes(c)&&c!==sk;
 $('#fCols').innerHTML=o.map((c,i)=>{const on=SHF.cols.includes(c),sh=vis(c),up=sh?o.slice(0,i).some(vis):i>0,dn=sh?o.slice(i+1).some(vis):i<o.length-1;
  return `<div class="cr"><button type="button" class="cn${on?' on':''}${on&&c===sk?' skip':''}" data-c="${c}" aria-pressed="${on}">${on?'✓ ':''}${FL[c]}</button><button type="button" class="mv" data-mv="-1" data-c="${c}" aria-label="Geser ${FL[c]} ke atas"${up?'':' disabled'}>▲</button><button type="button" class="mv" data-mv="1" data-c="${c}" aria-label="Geser ${FL[c]} ke bawah"${dn?'':' disabled'}>▼</button></div>`}).join('')}
$('#fCols').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const c=b.dataset.c,o=SHF.order,sk=fSkip(),vis=x=>SHF.cols.includes(x)&&x!==sk;
 if(b.dataset.mv){const d=Number(b.dataset.mv),i=o.indexOf(c);
  if(vis(c)){let k=i+d;while(k>=0&&k<o.length&&!vis(o[k]))k+=d;if(k<0||k>=o.length)return;o.splice(i,1);o.splice(k,0,c)}
  else{const k=i+d;if(k<0||k>=o.length)return;[o[i],o[k]]=[o[k],o[i]]}}
 else SHF.cols=SHF.cols.includes(c)?SHF.cols.filter(x=>x!==c):[...SHF.cols,c];
 shSave();drawFCols();shRebuild()};
function fmtUi(){const tp=SHT.mode==='tpl',w=[],none=SHT.by==='none';
 $('#fmtForm').hidden=tp;$('#fmtTpl').hidden=!tp;$('#mdForm').classList.toggle('on',!tp);$('#mdTpl').classList.toggle('on',tp);
 for(const k in TF){const u=unknownKeys(SHT[k],SH_KEYS[k]);if(u.length)w.push($(TF[k]).dataset.lbl+': {'+u.join('}, {')+'}')}
 $('#tWarn').textContent=w.length?'Kata kunci tidak dikenal (akan tampil apa adanya) → '+w.join(' · '):'';
 $('#tGrp').disabled=none;$('#tEmpH').disabled=$('#tEmpR').disabled=$('#fEmpT').disabled=$('#fEmpX').disabled=!SHT.emp;$('#fPre').disabled=$('#fCount').disabled=none}
function fmtLoad(){for(const k in TF)$(TF[k]).value=SHT[k];for(const k in FT)$(FT[k]).value=SHF[k];for(const k in FB)$(FB[k]).checked=!!SHF[k];for(const k in FS)$(FS[k]).value=SHF[k];
 $('#shBy').value=SHT.by;$('#shSort').value=SHT.sort;$('#tEmp').checked=!!SHT.emp;drawChips();drawFCols();fmtUi()}
function fmtChange(){for(const k in TF)SHT[k]=$(TF[k]).value;for(const k in FT)SHF[k]=$(FT[k]).value;for(const k in FB)SHF[k]=$(FB[k]).checked;for(const k in FS)SHF[k]=$(FS[k]).value;
 SHT.by=$('#shBy').value;SHT.sort=$('#shSort').value;SHT.emp=$('#tEmp').checked;shSave();fmtUi();drawFCols();shRebuild()}
Object.entries(TF).forEach(([k,s])=>{$(s).addEventListener('input',fmtChange);$(s).addEventListener('focus',()=>{tFocus=k;drawChips()})});
Object.values(FT).forEach(s=>$(s).addEventListener('input',fmtChange));
[...Object.values(FB),...Object.values(FS),'#shBy','#shSort','#tEmp'].forEach(s=>$(s).addEventListener('change',fmtChange));
['#mdForm','#mdTpl'].forEach(s=>$(s).onclick=()=>{SHT.mode=$(s).dataset.m;shSave();fmtLoad();shRebuild()});
$('#tFromForm').onclick=()=>{Object.assign(SHT,deriveTpl(SHF,SHT.by));shSave();fmtLoad();shRebuild()};
$('#tChips').onpointerdown=e=>e.preventDefault();   // jaga fokus kolom saat mengetuk kata kunci
$('#tChips').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=$(TF[tFocus]),s=a.selectionStart,n=a.selectionEnd,k=b.dataset.k;
 a.value=a.value.slice(0,s)+k+a.value.slice(n);a.focus();a.setSelectionRange(s+k.length,s+k.length);fmtChange()};
$('#tReset').onclick=()=>{SHT={...SH_DEF};SHF={...SHF_DEF,order:[...SHF_DEF.order],cols:[...SHF_DEF.cols]};shSave();fmtLoad();shRebuild()};
$('#shFmtBtn').onclick=()=>{const p=$('#shFmt');p.hidden=!p.hidden;$('#shFmtBtn').setAttribute('aria-expanded',String(!p.hidden));$('#shFmtBtn').textContent='Atur format '+(p.hidden?'▾':'▴')};
// --- dialog ---
$('#mShare').onclick=()=>{menu.hidden=true;
 $('#shVis').textContent='Yang tampil sekarang'+(($('#sq').value||'').trim()?' (ikut pencarian)':'')+' · '+VIS.length+' baris';
 $('#shAll').textContent='Semua data · '+M.length+' baris';
 document.querySelector('input[name=shs][value=vis]').checked=true;fmtLoad();shRebuild();$('#sh').showModal()};
document.querySelectorAll('input[name=shs]').forEach(r=>r.onchange=shRebuild);
$('#shParts').onclick=e=>{const b=e.target.closest('button');if(!b)return;shIdx=Number(b.dataset.i);shShow()};
$('#shText').addEventListener('input',()=>{shParts[shIdx]=$('#shText').value});
$('#shx').onclick=()=>$('#sh').close();
$('#shSend').onclick=()=>{window.open('https://wa.me/?text='+encodeURIComponent($('#shText').value),'_blank','noopener')};
$('#shCopy').onclick=async()=>{const a=$('#shText');try{await navigator.clipboard.writeText(a.value)}catch{a.select();document.execCommand('copy')}$('#shNote').textContent='Tersalin ✓'};
// ---- Mulai ----
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
net();purgeOldDB().then(load).then(()=>{sync();rtConnect()});setInterval(()=>{if(!wsOk)sync()},15000);setInterval(sync,60000);

;(function(){const t=document.querySelector('.top');if(!t)return;const f=()=>document.documentElement.style.setProperty('--hh',t.offsetHeight+'px');f();addEventListener('resize',f);if(window.ResizeObserver)new ResizeObserver(f).observe(t)})();
