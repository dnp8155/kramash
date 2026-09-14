// Kramashah Service Worker — production offline shell.
// Strategy:
//   - Navigations: network-first, fallback to cached index.html, then offline page
//   - Same-origin static assets (JS/CSS/fonts/images): stale-while-revalidate
//   - API calls (base44.app / /functions/): network-only, never cached
const CACHE_VERSION = "kramasha-v1";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = ["/", OFFLINE_URL];

// --- Install: pre-cache the app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Do NOT skipWaiting — wait for the user to trigger update via SKIP_WAITING.
});

// --- Activate: clean up old caches ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// --- Helpers ---
function isApiRequest(url) {
  return (
    url.hostname.includes("base44.app") ||
    url.pathname.startsWith("/functions/")
  );
}

// --- Fetch handler ---
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept API calls — always go to network.
  if (isApiRequest(url)) return;

  // Navigation requests: network-first, fallback to cache, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest HTML.
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() =>
          caches.match("/").then(
            (cached) =>
              cached ||
              caches.match(OFFLINE_URL).then((offline) => offline || Response.error())
          )
        )
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// --- Message handler: apply update when user clicks "Update Now" ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
