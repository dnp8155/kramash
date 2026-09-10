// Kramasha Service Worker
// Strategy: stale-while-revalidate for static assets, network-first for API.
// On offline navigation, fall back to cached app shell.

const CACHE_VERSION = "kramasha-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Assets from same-origin / media.base44 that are safe to cache.
const CACHEABLE_PATTERNS = [
  /^https:\/\/.*\.base44\.app\/.*/i,
  /^https:\/\/media\.base44\.com\/.*/i,
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
];

// Never cache API calls or backend function invocations.
const NEVER_CACHE_PATTERNS = [
  /\/functions\//i,
  /\/api\//i,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip non-http(s) requests (e.g., chrome-extension://).
  if (!url.protocol.startsWith("http")) return;

  // Skip backend function / API calls — always go to network.
  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    return;
  }

  // Navigation requests: network-first, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const shell = await caches.open(SHELL_CACHE);
          const fallback = await shell.match("/index.html");
          return fallback || Response.error();
        }
      })()
    );
    return;
  }

  // Cacheable static assets: stale-while-revalidate.
  const isCacheable = CACHEABLE_PATTERNS.some((p) => p.test(url.href)) || url.origin === self.location.origin;
  if (!isCacheable) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cached) {
        // Return cached immediately, update in background.
        return cached;
      }
      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;
      return cached || Response.error();
    })()
  );
});
