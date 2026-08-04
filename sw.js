const CACHE_NAME = "operation-static-v9";
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
  const isCode = /\.(js|css|html)$/.test(url.pathname) || url.pathname.includes("/layouts/") || url.pathname.includes("/assets/config/");
  if (!isCode && !url.pathname.includes("/assets/images/")) return;
  // Network first for code so new modules and fixes appear immediately after deployment.
  event.respondWith(fetch(req).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, response.clone()));
    return response;
  }).catch(() => caches.match(req)));
});
