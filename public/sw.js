// Kramashah Service Worker
// Caches the application shell for offline loading.
// Does NOT cache authenticated API responses — workspace data is always
// fetched live from the network so a different user's data is never served
// from a stale cache.

const CACHE_NAME = "kramashah-v1.5.0";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install: pre-cache the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigation requests (HTML): network-first, fall back to cached shell when
//   offline so the PWA can launch.
// - Static assets from same origin (JS, CSS, fonts, icons): stale-while-revalidate.
// - API calls and cross-origin requests: network-only — never cache private data.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests.
  if (request.method !== "GET") return;

  // Navigation requests — network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Same-origin static assets — stale-while-revalidate.
  if (url.origin === self.location.origin) {
    // Skip API calls (base44 endpoints) — always network-only.
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/")) {
      return;
    }
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cross-origin (fonts, etc.) — stale-while-revalidate, no harm.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Listen for messages from the page (e.g. "skipWaiting" for updates).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
