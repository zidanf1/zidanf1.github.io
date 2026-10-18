const C='warehouse-v25',A=['./','index.html','app.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/logo-64.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// network-first: saat online selalu ambil versi terbaru; saat offline pakai cache
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.hostname.endsWith('supabase.co'))return;
  e.respondWith(fetch(e.request).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp))}return res})
    .catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
