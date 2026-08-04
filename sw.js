const CACHE_NAME = "operation-system-static-v5";
const CORE = [
  "./", "./index.html", "./assets/css/style.css", "./layouts/login.html", "./layouts/main.html",
  "./assets/js/core/app.js", "./assets/js/core/router.js", "./assets/js/core/module-loader.js",
  "./assets/themes/genius.css"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/assets/") || url.pathname.includes("/layouts/") || url.pathname.endsWith(".html")) {
    event.respondWith(caches.match(req).then(cached => {
      const fresh = fetch(req).then(response => {
        if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || fresh;
    }));
  }
});
