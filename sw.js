const V='5.56.59';
const CACHE_NAME='packing-auto-pack-v5-56-59-shell';
// v5.56.59: ไฟล์ CSS ใน assets/ ผูก ?v=<เวอร์ชัน> เพื่อให้เครื่องที่ยังมี Service Worker รุ่นเก่าไม่หยิบ CSS เก่าจากแคชมาใช้กับหน้าใหม่
// v5.56.59: ตอนติดตั้ง SW ดึงไฟล์ด้วย cache:'reload' (ข้าม HTTP cache) และลบระบบ precache CDN เดิมที่ไม่ได้ใช้แล้วออก
const APP_SHELL='./index.html';
const STATIC_ASSETS=[APP_SHELL,'./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./packing-logo.png','./assets/tailwind.css?v='+V,'./assets/fontawesome.css?v='+V,'./assets/sarabun.css?v='+V,'./assets/fonts/fa-solid-900.woff2','./assets/fonts/sarabun-thai-400-normal.woff2','./assets/fonts/sarabun-thai-500-normal.woff2','./assets/fonts/sarabun-thai-600-normal.woff2','./assets/fonts/sarabun-thai-700-normal.woff2','./assets/fonts/sarabun-thai-800-normal.woff2','./assets/fonts/sarabun-latin-400-normal.woff2','./assets/fonts/sarabun-latin-500-normal.woff2','./assets/fonts/sarabun-latin-600-normal.woff2','./assets/fonts/sarabun-latin-700-normal.woff2','./assets/fonts/sarabun-latin-800-normal.woff2'];
// เปิดหน้าแอป: ใช้ของใหม่จากเน็ตถ้าตอบทันใน NAV_TIMEOUT_MS ไม่งั้นใช้ของในแคช (ออฟไลน์/สัญญาณอ่อน)
const NAV_TIMEOUT_MS=3500;
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE_NAME);
 await Promise.all(STATIC_ASSETS.map(async u=>{
  const res=await fetch(new Request(u,{cache:'reload'}));
  if(!res.ok)throw new Error('precache failed: '+u+' '+res.status);
  await c.put(u,res);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('packing-auto-pack-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin!==self.location.origin)return;
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
 e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(x=>{if(x.ok)caches.open(CACHE_NAME).then(c=>c.put(r,x.clone()));return x}).catch(()=>cached)));
});
