window.WH_VER='25';
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
// ---- IndexedDB (offline-first) ----
const DB=new Promise((ok,no)=>{const r=indexedDB.open('warehouse',1);
 r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('maps',{keyPath:'id'});d.createObjectStore('items',{keyPath:'lotcode'});d.createObjectStore('meta',{keyPath:'k'})};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=async(s,m,f)=>{const d=await DB;return new Promise((ok,no)=>{const t=d.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})};
const all=s=>tx(s,'readonly',o=>o.getAll()),get=(s,k)=>tx(s,'readonly',o=>o.get(k)),put=(s,v)=>tx(s,'readwrite',o=>o.put(v));
const setMeta=(k,v)=>put('meta',{k,v}),getMeta=async k=>(await get('meta',k))?.v;
// ---- State & render ----
let M=[],I={},sort=0,cur=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nat=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
const p2=n=>String(n).padStart(2,'0');
const fmt=d=>d.toLocaleDateString('id-ID',{weekday:'long'})+', '+p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+d.getFullYear()+' '+p2(d.getHours())+':'+p2(d.getMinutes());
async function load(){
 M=(await all('maps')).filter(x=>!x.deleted);
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
 r.sort(sort?(a,b)=>sort*nat(a.idrak,b.idrak):(a,b)=>ord(a).localeCompare(ord(b)));
 $('#sortB').textContent='Urutkan Rak'+(sort===1?' ↑':sort===-1?' ↓':'');
 const cols=SET.order.filter(c=>c==='lotcode'||SET.cols.includes(c));   // Lotcode selalu tampil; urutan sesuai pengaturan pengguna (bawaan: Lotcode paling depan)
 $('#th').innerHTML='<tr><th>IDRak</th>'+cols.map(c=>`<th${c==='lotcode'?' class="lc"':''}>${CL[c]}</th>`).join('')+'</tr>';
 const rk=id=>String(id).split('-')[0];   // 'A1-3' -> rak 'A1' (kolom diabaikan)
 $('#tb').innerHTML=r.map((m,i)=>{const it=I[m.lotcode];
  return `<tr data-id="${m.id}" class="${i===r.length-1||rk(r[i+1].idrak)!==rk(m.idrak)?'ge':''}"><td>${esc(m.idrak)}</td>`+cols.map(c=>c==='lotcode'?`<td class="lc">${m.lotcode?`<span class="lt" title="${esc(m.lotcode)}">${esc(m.lotcode)}</span>`:'<span class="kos">● kosong</span>'}</td>`:`<td>${it&&(c==='qty'||it[c])?(c==='qty'?esc(it[c]):`<span class="cx" title="${esc(it[c])}">${esc(it[c])}</span>`):'-'}</td>`).join('')+'</tr>'}).join('');
 $('#emp').hidden=r.length>0;
}
$('#sq').addEventListener('input',()=>render());
$('#sx').onclick=()=>{$('#sq').value='';render();$('#sq').focus()};
$('#sq').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sq').value='';render()}});
$('#sortB').onclick=()=>{sort=sort===1?-1:1;render()};
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
$('#delLot').onclick=async()=>{const v=$('#q').value.trim(),it=I[v];if(!it)return;
 const aff=M.filter(m=>m.lotcode===v);
 if(!confirm('Hapus lotcode '+v+'?'+(aff.length?'\n'+aff.length+' rak yang memakai lot ini akan menjadi kosong.':'')))return;
 const now=new Date().toISOString();
 await put('items',{...it,deleted:true,dirty:1,updated_at:now});
 for(const m of aff)await put('maps',{...m,lotcode:'',dirty:1,updated_at:now});
 $('#dg').close();await changed()};
$('#editLot').onclick=()=>{setLotF(I[$('#q').value.trim()]);editLot=true;upd()};
function openForm(m){cur=m||null;$('#dt').textContent=m?'Ubah Baris':'Tambah Baris';$('#del').hidden=!m;
 fillRak(m?m.idrak:'');$('#rakNew').value='';$('#q').value=m?m.lotcode:'';flt='';editLot=false;forceNew=false;lastV=null;wasNew=false;upd();$('#dg').showModal()}
$('#add').onclick=()=>openForm();$('#cx').onclick=$('#cx2').onclick=()=>$('#dg').close();
$('#tb').onclick=e=>{const tr=e.target.closest('tr');if(tr)openForm(M.find(x=>x.id===tr.dataset.id))};
$('#fm2').onsubmit=async e=>{
 const rk=($('#rak').value==='__new'?$('#rakNew').value:$('#rak').value).trim().toUpperCase(),v=$('#q').value.trim().toUpperCase();
 if(!rk){e.preventDefault();$('#rakNew').focus();return}
 {const v0=$('#q').value.trim();if(v0&&!I[v0]&&!newOk(v0)){e.preventDefault();const m=$('#lotMsg');m.textContent='Lotcode “'+v0+'” belum ada. Pilih dari daftar, atau tekan Enter untuk membuat lot baru.';m.hidden=false;return}}
 const now=new Date().toISOString();
 await put('maps',{id:cur?.id||crypto.randomUUID(),idrak:rk,lotcode:v,created:cur?.created||cur?.updated_at||now,updated_at:now,deleted:false,dirty:1});
 if(v&&(!I[v]||editLot))await put('items',{...(I[v]||{}),lotcode:v,model:$('#fModel').value.trim().toUpperCase(),style:$('#fStyle').value.trim().toUpperCase(),spk:$('#fSpk').value.trim().toUpperCase(),qty:+$('#fQty').value||0,updated_at:now,deleted:false,dirty:1});
 await changed();
};
$('#del').onclick=async()=>{if(!cur||!confirm('Hapus baris ini?'))return;
 await put('maps',{...cur,deleted:true,dirty:1,updated_at:new Date().toISOString()});$('#dg').close();await changed()};
async function changed(){await setMeta('upd',new Date().toISOString());await load();clearTimeout(changed.t);changed.t=setTimeout(sync,1500)}
// ---- Sinkronisasi Supabase ----
const stat=t=>{const s=$('#st');s.textContent=/^Tersinkron/.test(t)?'':t;s.className=/^Gagal/.test(t)?'err':'';$('#sy').title=t||'Sinkron sekarang'};
async function pend(){const n=(await all('maps')).filter(x=>x.dirty).length+(await all('items')).filter(x=>x.dirty).length;$('#sy').classList.toggle('pend',!!sb&&n>0)}
async function sync(){
 if(!sb)return stat('Mode lokal (Supabase belum diisi)');
 if(!navigator.onLine)return stat('Offline');
 try{$('#sy').classList.add('spin');
  const dm=(await all('maps')).filter(x=>x.dirty);
  if(dm.length){const {error}=await sb.from('maps').upsert(dm.map(r=>({id:r.id,idrak:r.idrak,lotcode:r.lotcode||null,deleted:!!r.deleted})),{onConflict:'id'});if(error)throw error;for(const r of dm)await put('maps',{...r,dirty:0})}
  const di=(await all('items')).filter(x=>x.dirty);
  if(di.length){const {error}=await sb.from('items').upsert(di.map(r=>({lotcode:r.lotcode,model:r.model,style:r.style,spk:r.spk,qty:r.qty,deleted:!!r.deleted})),{onConflict:'lotcode'});if(error)throw error;for(const r of di)await put('items',{...r,dirty:0})}
  let since=await getMeta('since')||'1970-01-01T00:00:00Z',mx=since;
  for(const t of ['maps','items']){const {data,error}=await sb.from(t).select('*').gt('updated_at',since);if(error)throw error;
   for(const r of data){const l=await get(t,t==='maps'?r.id:r.lotcode);if(l?.dirty)continue;
    await put(t,{...(l||{}),...r,lotcode:r.lotcode||''});if(r.updated_at>mx)mx=r.updated_at}}
  await setMeta('since',mx);await setMeta('upd',new Date().toISOString());await load();stat('Tersinkron '+fmt(new Date()));
 }catch(e){console.error(e);stat('Gagal sinkron: '+(e.message||e))}
 $('#sy').classList.remove('spin');net();pend();
}
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
// ---- Bagikan via WhatsApp (bentuk form) ----
// Pesan disusun dari pilihan form. Preset "Ringkas" = format lama: grup per MODEL, baris "idrak > lotcode qty", "RAK KOSONG" di akhir.
let WA_MAX=1200;   // batas karakter per pesan; lebih dari itu dibagi beberapa bagian (tiap bagian dikirim terpisah)
let VIS=[],shParts=[],shIdx=0;
const p2s=n=>String(n).padStart(2,'0');
const SHF=['idrak','lot','model','style','spk','qty'],SHL={idrak:'IDRak',lot:'Lotcode',model:'Model',style:'Style',spk:'SPK',qty:'Qty'};
const SHP={ringkas:{idrak:1,lot:1,model:0,style:0,spk:0,qty:1},lengkap:{idrak:1,lot:1,model:1,style:1,spk:1,qty:1},tabel:{idrak:1,lot:1,model:0,style:0,spk:0,qty:1}};
const SHS={ringkas:'>',lengkap:'|',tabel:' '};   // pemisah bawaan tiap preset (bisa diganti)
const SEPS={'>':' > ','|':' | ','-':' - ',' ':' '};
const SHD={title:'',preset:'ringkas',grp:'model',sort:'lot',f:{...SHP.ringkas},sum:1,emp:1,sep:'>',hd:'bold',max:1200,memo:''};
let SHO={...SHD,f:{...SHD.f}};
try{const s=JSON.parse(localStorage.getItem('wh_sh')||'{}');Object.assign(SHO,s);SHO.f={...SHD.f,...(s.f||{})};SHO.memo=''}catch{}
WA_MAX=Math.max(300,+SHO.max||1200);
const shSave=()=>{try{const{memo,...r}=SHO;localStorage.setItem('wh_sh',JSON.stringify(r))}catch{}};
function packParts(head,blocks,max,fmt){
 const parts=[],hf=head.split('\n')[0];let cur=[],len=0,inF=false;
 const open=t=>{cur=[t];len=t.length},close=()=>{if(inF){cur.push('```');inF=false}parts.push(cur.join('\n'));cur=[];len=0};
 open(head);
 for(const b of blocks){
  let cont=false;
  const gstart=()=>{const hd=fmt(b,cont);cur.push('');len++;if(hd){cur.push(hd);len+=hd.length+1}
   if(b.fence){cur.push('```');len+=4;inF=true}};
  gstart();
  for(const ln of b.lines){
   if(len+ln.length+1>max&&cur.length>3){close();open(hf+' (lanjutan)');cont=true;gstart()}
   cur.push(ln);len+=ln.length+1;
  }
  if(inF){cur.push('```');inF=false}
 }
 close();
 if(parts.length>1)parts.forEach((t,i)=>{parts[i]=t.replace(/^[^\n]*/,`${hf} (bagian ${i+1}/${parts.length})`)});
 return parts;
}
function shLine(v,o,ks,w){
 const sp=SEPS[o.sep]||' > ',g=k=>String(v[k]);
 if(o.preset==='tabel')return ks.map((k,i)=>i<ks.length-1?g(k).padEnd(w[k]):g(k)).join(sp);
 if(o.preset==='lengkap')return ks.map(g).join(sp);
 return ks.length>1?g(ks[0])+sp+ks.slice(1).map(g).join(' '):ks.map(g).join('');
}
function shareBuild(scope,o){
 o=o||SHO;
 const rows=(scope==='all'?M:VIS).slice(),byNat=(a,b)=>nat(String(a),String(b)),dash=x=>String(x==null?'':x).trim()||'-';
 const ks=SHF.filter(k=>o.f[k]),K=ks.length?ks:['idrak','lot'],sp=SEPS[o.sep]||' > ',fence=o.preset==='tabel';
 const filled=rows.filter(m=>m.lotcode),empty=rows.filter(m=>!m.lotcode),NM='(TANPA MODEL)';
 const vals=filled.map(m=>{const it=I[m.lotcode]||{};return{mod:String(it.model||'').trim().toUpperCase()||NM,v:{idrak:m.idrak,lot:m.lotcode,model:dash(it.model).toUpperCase(),style:dash(it.style),spk:dash(it.spk),qty:it.qty==null?'-':it.qty}}});
 const fSet=new Set(filled.map(m=>m.idrak)),eList=[...new Set(empty.map(m=>m.idrak))].filter(i=>!fSet.has(i)).sort(byNat);
 const w={};for(const k of SHF)w[k]=Math.max(...vals.map(x=>String(x.v[k]).length),0);w.idrak=Math.max(w.idrak,...eList.map(i=>i.length),0);
 const cmp=o.sort==='rak'?(a,b)=>byNat(a.v.idrak,b.v.idrak):(a,b)=>byNat(a.v.lot,b.v.lot)||byNat(a.v.idrak,b.v.idrak);
 const groups={};for(const x of vals)(groups[o.grp==='none'?'':x.mod]=groups[o.grp==='none'?'':x.mod]||[]).push(x);
 const names=Object.keys(groups).sort((a,b)=>a===NM?1:b===NM?-1:byNat(a,b));
 const blocks=names.map(n=>({h:n,fence,lines:groups[n].sort(cmp).map(x=>shLine(x.v,o,K,w))}));
 if(eList.length&&o.emp)blocks.push({h:'RAK KOSONG',sys:1,fence,lines:eList.map(i=>(o.preset==='tabel'?i.padEnd(w.idrak):i)+sp+'kosong')});
 const fmt=(b,cont)=>{if(!b.h||(o.hd==='none'&&!b.sys))return '';const t=o.hd==='line'&&!b.sys?'— '+b.h+' —':'*'+b.h+'*';return t+(cont?' (lanjutan)':'')};
 const d=new Date(),q=scope==='all'?'':($('#sq').value||'').trim().toUpperCase(),nMod=new Set(vals.map(x=>x.mod)).size;
 const head=['*📦 WAREHOUSE – MAPS*',(o.title||'').trim(),o.sum?`${p2s(d.getDate())}/${p2s(d.getMonth()+1)}/${d.getFullYear()} ${p2s(d.getHours())}:${p2s(d.getMinutes())}`:'',
  q?'🔎 Pencarian: '+q:'',o.sum?`${nMod} model · ${new Set(filled.map(m=>m.lotcode)).size} lot · ${fSet.size} rak terisi · ${eList.length} rak kosong`:''].filter(Boolean).join('\n');
 const parts=blocks.length?packParts(head,blocks,WA_MAX,fmt):[head+'\n\n(tidak ada data)'];
 const memo=(o.memo||'').trim();if(memo)parts[parts.length-1]+='\n\n📝 '+memo;
 return parts;
}
function shShow(){const n=shParts.length,bx=$('#shParts');
 bx.hidden=n<2;bx.innerHTML=shParts.map((_,i)=>`<button type="button" data-i="${i}" class="${i===shIdx?'on':''}">Bagian ${i+1}</button>`).join('');
 $('#shText').value=shParts[shIdx];
 $('#shNote').textContent=n>1?`Pesan panjang dibagi ${n} bagian (±${WA_MAX} karakter). Kirim satu per satu.`:shParts[0].length+' karakter';
 $('#shSend').textContent=n>1?`Kirim bagian ${shIdx+1} ke WhatsApp`:'Kirim ke WhatsApp'}
function shRebuild(){shParts=shareBuild(document.querySelector('input[name=shs]:checked').value);shIdx=0;shShow()}
// form → SHO
function shSync(){   // tampilkan nilai SHO di form
 $('#shTitle').value=SHO.title;$('#shGrp').value=SHO.grp;$('#shSort').value=SHO.sort;$('#shMax').value=WA_MAX;$('#shMemo').value=SHO.memo||'';
 $('#shSum').checked=!!SHO.sum;$('#shEmp').checked=!!SHO.emp;
 document.querySelectorAll('#shFlds input').forEach(c=>c.checked=!!SHO.f[c.dataset.f]);
 for(const [id,key] of [['shPre','preset'],['shSep','sep'],['shHd','hd']])document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===String(SHO[key])));
}
function shChange(){SHO.title=$('#shTitle').value;SHO.grp=$('#shGrp').value;SHO.sort=$('#shSort').value;SHO.memo=$('#shMemo').value;
 SHO.sum=$('#shSum').checked?1:0;SHO.emp=$('#shEmp').checked?1:0;
 document.querySelectorAll('#shFlds input').forEach(c=>SHO.f[c.dataset.f]=c.checked?1:0);
 const mx=Math.max(300,+$('#shMax').value||1200);WA_MAX=mx;SHO.max=mx;shSave();shRebuild()}
document.querySelectorAll('#shForm input:not([type=radio]),#shForm select').forEach(e=>{e.addEventListener('input',shChange);e.addEventListener('change',shChange)});
for(const [id,key] of [['shPre','preset'],['shSep','sep'],['shHd','hd']])$('#'+id).onclick=e=>{const b=e.target.closest('button');if(!b)return;
 SHO[key]=b.dataset.v;if(key==='preset'){SHO.f={...SHP[b.dataset.v]};SHO.sep=SHS[b.dataset.v]}shSync();shSave();shRebuild()};
$('#shReset').onclick=()=>{const mem=SHO.memo;SHO={...SHD,f:{...SHD.f},memo:mem};WA_MAX=SHD.max;shSync();shSave();shRebuild()};
$('#mShare').onclick=()=>{menu.hidden=true;
 $('#shVis').textContent='Yang tampil sekarang'+(($('#sq').value||'').trim()?' (ikut pencarian)':'')+' · '+VIS.length+' baris';
 $('#shAll').textContent='Semua data · '+M.length+' baris';
 document.querySelector('input[name=shs][value=vis]').checked=true;SHO.memo='';shSync();shRebuild();$('#sh').showModal()};
document.querySelectorAll('input[name=shs]').forEach(r=>r.onchange=shRebuild);
$('#shParts').onclick=e=>{const b=e.target.closest('button');if(!b)return;shIdx=Number(b.dataset.i);shShow()};
$('#shText').addEventListener('input',()=>{shParts[shIdx]=$('#shText').value});
$('#shx').onclick=()=>$('#sh').close();
$('#shSend').onclick=()=>{window.open('https://wa.me/?text='+encodeURIComponent($('#shText').value),'_blank','noopener')};
$('#shCopy').onclick=async()=>{const a=$('#shText');try{await navigator.clipboard.writeText(a.value)}catch{a.select();document.execCommand('copy')}$('#shNote').textContent='Tersalin ✓'};
// ---- Mulai ----
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
net();load().then(sync);setInterval(sync,60000);
