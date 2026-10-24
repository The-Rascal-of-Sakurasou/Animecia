const CACHE="animecia-static-v10";
const STATIC=/\.(?:css|js|woff2?|png|jpe?g|webp|gif|svg)(?:\?.*)?$/i;

self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith("animecia-")&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.registration.navigationPreload?.enable())
    .then(()=>self.clients.claim())
));

self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.origin!==location.origin) return;

  if(STATIC.test(u.pathname)){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(r);
      const update=fetch(r).then(net=>{
        if(net.ok)c.put(r,net.clone());
        return net;
      }).catch(()=>null);
      return hit || await update || Response.error();
    }));
    return;
  }

  if(r.mode==="navigate"){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(r);
      const update=(async()=>{
        try{
          const pre=await e.preloadResponse;
          const net=pre || await fetch(r,{cache:"no-cache"});
          if(net.ok)c.put(r,net.clone());
          return net;
        }catch(_){return null}
      })();
      return hit || await update || Response.error();
    }));
  }
});