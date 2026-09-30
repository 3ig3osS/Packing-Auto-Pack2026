const CACHE_NAME='packing-auto-pack-v5-56-23-shell';
const APP_SHELL='./index.html';
const STATIC_ASSETS=[APP_SHELL,'./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
const CDN_HOSTS=new Set(['cdn.tailwindcss.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com']);
// v5.56.19: ถ้าเครือข่ายตอบช้าเกินเวลานี้ และมีหน้าแอปในแคชอยู่แล้ว ให้เปิดจากแคชทันที (เครือข่ายยังโหลดต่อเพื่ออัปเดตแคชรอบหน้า)
const NAV_TIMEOUT_MS=3500;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('packing-auto-pack-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin!==self.location.origin && !CDN_HOSTS.has(u.host))return;
 if(r.mode==='navigate'){
  let done;const keepAlive=new Promise(res=>{done=res});e.waitUntil(keepAlive);
  e.respondWith((async()=>{
   const cache=await caches.open(CACHE_NAME);
   const net=fetch(r).then(x=>{if(x.ok)cache.put(r,x.clone());return x});
   net.then(done,done);
   const cached=(await cache.match(r,{ignoreSearch:true}))||(await cache.match(APP_SHELL));
   if(!cached)return net;
   let timer;
   const timeout=new Promise(res=>{timer=setTimeout(()=>res(null),NAV_TIMEOUT_MS)});
   try{const x=await Promise.race([net,timeout]);clearTimeout(timer);if(x)return x}catch(_){clearTimeout(timer)}
   return cached;
  })());
  return;
 }
 e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(x=>{if(x.ok||x.type==='opaque')caches.open(CACHE_NAME).then(c=>c.put(r,x.clone()));return x}).catch(()=>cached)));
});
