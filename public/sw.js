// MARIO Service Worker v3 — online-first, icone e manifest in cache
// Aggiorna CACHE_V ad ogni release per invalidare la cache precedente.
const CACHE_V = 'mario-v3';
const STATIC_CACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512-maskable.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_V)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .catch(() => { /* ignora se una risorsa non è disponibile */ }),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_V).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // POST e chiamate API: sempre network diretto (no cache)
  if (request.method !== 'GET' || url.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Risorse statiche dichiarate: cache-first → fallback network
  if (STATIC_CACHE.some((s) => url.includes(s))) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // Tutto il resto (pagine HTML, chunks JS): network-first → nessun fallback offline
  event.respondWith(fetch(request));
});
