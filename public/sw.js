// Kramasha Service Worker — app shell caching + offline fallback
// Cache version changes on each deploy to bust old caches.

const CACHE_VERSION = "kramasha-2026-09-11-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const NAVIGATION_CACHE = `${CACHE_VERSION}-nav`;

// Assets to pre-cache on install (app shell).
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install — pre-cache the app shell, skip waiting so new SW activates immediately.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — clean up ALL old caches from previous versions, claim all clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// Helper: determine request type.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.includes("/functions/");
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// Fetch handler — network-first for navigation (always fresh when online),
// stale-while-revalidate for static assets, network-only for API.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Skip non-http(s) requests.
  if (!url.protocol.startsWith("http")) return;

  // Navigation requests — network-first with cache fallback.
  // This ensures the user ALWAYS gets the latest index.html when online.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response for offline use.
          const copy = response.clone();
          caches.open(NAVIGATION_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Same-origin static assets — stale-while-revalidate.
  // Hashed filenames mean new deploys get new URLs, so this is safe.
  if (isSameOrigin(url) && isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // API requests — network-only, never cache (data must be fresh).
  if (isApiRequest(url)) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

  // Cross-origin (fonts, images from CDNs) — stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Listen for skip-waiting message from the page (update flow).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
