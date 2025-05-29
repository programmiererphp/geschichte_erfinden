
/*  Service Worker für „Story Invent“
    – Cache-first für statische Assets
    – Network-first für API-Calls (OpenRouter etc.)
    – Offline-Fallback für index.html
*/
const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE = [
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/js/aiGateway.js",
  "/js/scenarioManager.js",
  "/js/ttsBrowser.js",
  "/js/sttBrowser.js",
  "/js/md.js",
  "/assets/i18n.json",
  "/assets/scenarios.json",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

/* ─── Install: statische Assets cachen ─── */
self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* ─── Activate: alte Caches bereinigen ─── */
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ─── Fetch-Handler ─── */
self.addEventListener("fetch", evt => {
  const { request } = evt;
  const url = new URL(request.url);

  /* 1. Same-origin und in Precache → Cache-first */
  if (url.origin === self.location.origin) {
    evt.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(resp => {
          /* Dynamic caching von sonstigen statischen Dateien */
          if (request.method === "GET" && resp.status === 200 && resp.type === "basic") {
            const respClone = resp.clone();
            caches.open(STATIC_CACHE).then(c => c.put(request, respClone));
          }
          return resp;
        })
      ).catch(() => caches.match("/index.html"))
    );
    return;
  }

  /* 2. Cross-origin (API / CDN) → Network-first mit Runtime-Cache */
  if (request.method === "GET") {
    evt.respondWith(
      fetch(request).then(resp => {
        const clone = resp.clone();
        caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
        return resp;
      }).catch(() =>
        caches.match(request)                      // offline-hit?
      )
    );
  }
});
