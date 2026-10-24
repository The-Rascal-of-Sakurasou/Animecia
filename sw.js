const CACHE = "animecia-static-v10";
const STATIC = /\.(?:css|js|woff2?|png|jpe?g|webp|gif|svg)(?:\?.*)?$/i;

function isSensitiveNavigation(url) {
  if (/\/(?:auth-callback|reset-password)\.html$/i.test(url.pathname)) return true;
  return ["code", "access_token", "refresh_token", "token_hash"].some(key => url.searchParams.has(key));
}

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("animecia-") && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.registration.navigationPreload?.enable())
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Never cache auth callback/reset pages or URLs carrying authentication tokens.
  if (request.mode === "navigate" && isSensitiveNavigation(url)) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      const update = fetch(request, { cache: "no-cache" }).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => null);
      return cached || await update || Response.error();
    }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      const update = (async () => {
        try {
          const preloaded = await event.preloadResponse;
          const response = preloaded || await fetch(request, { cache: "no-cache" });
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (_) {
          return null;
        }
      })();
      return cached || await update || Response.error();
    }));
  }
});
