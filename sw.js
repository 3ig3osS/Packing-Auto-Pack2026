const CACHE_NAME='packing-auto-pack-v5-56-43-shell';
// v5.56.43: เปลี่ยน cache key เพื่อบังคับ client รับ shell รุ่นใหม่และล้าง cache รุ่นเก่า
const APP_SHELL='./index.html';
const STATIC_ASSETS=[APP_SHELL,'./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./assets/packing-logo.png'];
// v5.56.39: ไฟล์ภายนอกที่หน้าตาแอปต้องใช้ — เก็บล่วงหน้าตอนติดตั้ง เพื่อให้เปิดออฟไลน์ครั้งแรกได้สไตล์ครบ
const CDN_PRECACHE=['https://cdn.tailwindcss.com','https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css','https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap'];
const CDN_HOSTS=new Set(['cdn.tailwindcss.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com']);
// ถ้าเครือข่ายตอบช้าเกินเวลานี้ และมีหน้าแอปในแคชอยู่แล้ว ให้เปิดจากแคชทันที (เครือข่ายยังโหลดต่อเพื่ออัปเดตแคชรอบหน้า)
const NAV_TIMEOUT_MS=3500;
// ดึงไฟล์ CDN + ไฟล์ฟอนต์ที่ CSS อ้างถึง; ล้มเหลวได้ (ไม่ทำให้ติดตั้ง SW ไม่สำเร็จ) — fetch handler จะเก็บเพิ่มเองตอนใช้งานปกติ
async function precacheCdn(cache){
 for(const url of CDN_PRECACHE){
  try{
   const res=await fetch(url,{mode:'cors'});
   if(!res.ok)continue;
   await cache.put(url,res.clone());
   if(url.endsWith('.css')||url.includes('fonts.googleapis.com')){
    const css=await res.text();
    const base=new URL(url);
    const urls=[...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/['"]/g,'').trim()).filter(u=>!u.startsWith('data:')).map(u=>new URL(u,base).href))];
    // woff2 เท่านั้น (เบราว์เซอร์ที่รองรับ SW ใช้ woff2 ได้หมด) ลดขนาดแคช
    await Promise.all(urls.filter(u=>/\.woff2(\?|$)/.test(u)||u.includes('fonts.gstatic.com')).map(async u=>{try{const r=await fetch(u,{mode:'cors'});if(r.ok)await cache.put(u,r)}catch(_){}}));
   }
  }catch(_){}
 }
}
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(async c=>{await c.addAll(STATIC_ASSETS);await precacheCdn(c)}).then(()=>self.skipWaiting())));
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
