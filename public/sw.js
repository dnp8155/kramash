// Kramasha Service Worker
// Strategy: network-first for everything, cache fallback when offline.
// This ensures users always get fresh content when online and never
// get stuck with stale cached versions. Old caches are cleaned on activate.

const CACHE_VERSION = "kramasha-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/offline.html"];

// Install: precache minimal app shell, activate immediately.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: delete all old caches, take control immediately.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Skip waiting on message from app (used by useServiceWorkerUpdate).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: network-first, cache fallback only when network fails.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API calls or backend functions — always go to network.
  if (url.pathname.startsWith("/functions/") || url.hostname !== self.location.hostname) {
    return;
  }

  // Navigation requests (HTML pages): network-first, fall back to cached index.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Static assets: stale-while-revalidate (serve cache, update in background).
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
