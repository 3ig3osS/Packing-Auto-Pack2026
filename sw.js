const CACHE_NAME='packing-auto-pack-v5-56-5-shell';
const APP_SHELL='./index.html';
const STATIC_ASSETS=[APP_SHELL,'./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const CDN_HOSTS=new Set(['cdn.tailwindcss.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com']);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('packing-auto-pack-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin!==self.location.origin && !CDN_HOSTS.has(u.host))return;
 if(r.mode==='navigate'){
  e.respondWith(fetch(r).then(x=>{caches.open(CACHE_NAME).then(c=>c.put(r,x.clone()));return x}).catch(()=>caches.match(r).then(x=>x||caches.match(APP_SHELL))));return;
 }
 e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(x=>{if(x.ok||x.type==='opaque')caches.open(CACHE_NAME).then(c=>c.put(r,x.clone()));return x}).catch(()=>cached)));
});
