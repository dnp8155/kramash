// Kramashah Service Worker
// Safe caching: app shell + static assets only. Never caches API/auth responses.
const SW_VERSION = "kramashah-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const ASSET_CACHE = `${SW_VERSION}-assets`;

// App shell URLs to precache.
const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/icon.svg", "/offline.html"];

// Never cache these patterns (private data + auth + API).
const NEVER_CACHE = [
  /\/api\//,
  /\/v2\//,
  /base44/,
  /auth/,
  /token/,
  /integration/,
  /entities\//,
  /functions\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !n.startsWith(SW_VERSION))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

function shouldNeverCache(url) {
  return NEVER_CACHE.some((p) => p.test(url));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept API/auth calls — always go to network.
  if (shouldNeverCache(url.pathname) || url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fall back to cached shell or offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then((r) => r || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Handle skip-waiting message from client (for updates).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
