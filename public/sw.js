// Kramashah Service Worker — production offline shell with USER-CONTROLLED updates.
//
// How updates work:
//   - Every build gets a BUILD_ID (a hash of its asset file names) and a list of all its assets,
//     both stamped into this file by the Vite plugin in vite.config.js. A new deploy therefore
//     produces a byte-different sw.js, which is what makes browsers notice there is an update.
//   - On install the new worker downloads the WHOLE new app into its own cache but does NOT
//     take over (no skipWaiting). The page keeps running — and keeps being served from — the
//     previous version's cache, so nothing changes under the user.
//   - The app shows the "new version available" banner. Only when the user taps "Update now" does
//     it post SKIP_WAITING; the new worker activates, old caches are deleted, the page reloads
//     and the What's new sheet appears.
//   - Navigations are served from the cache (not the network) precisely so a deploy cannot change
//     the app on a plain refresh.
//   - API calls (cross-origin Supabase etc.) are never intercepted.
const BUILD_ID = "__BUILD_ID__";
let PRECACHE_URLS = [];
try { PRECACHE_URLS = JSON.parse('__PRECACHE_URLS__'); } catch { /* dev / unstamped build */ }

const CACHE = `kramasha-${BUILD_ID}`;
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = ["/", OFFLINE_URL, "/manifest.json", "/kramasha_logo_192x192.png", "/kramasha_logo_512x512.png", "/icon.svg"];

// --- Install: download the full new version into its own cache, then WAIT. ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: "reload" bypasses the HTTP cache so we never store a stale index.html.
      Promise.all([...new Set([...SHELL_URLS, ...PRECACHE_URLS])].map((url) => cache.add(new Request(url, { cache: "reload" }))))
    )
  );
  // Do NOT skipWaiting — the user triggers the update (see the message handler below).
});

// --- Activate: runs only after the user applied the update (or on first install). ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// --- Fetch ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only same-origin requests are handled; Supabase / API / third-party calls go straight to the network.
  if (url.origin !== self.location.origin) return;

  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

  // App navigations (SPA routes): serve this version's shell from cache.
  if (request.mode === "navigate" && !hasExtension) {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match("/")).then(
        (shell) =>
          shell ||
          fetch(request).catch(() =>
            caches.open(CACHE).then((c) => c.match(OFFLINE_URL)).then((offline) => offline || Response.error())
          )
      )
    );
    return;
  }

  // Hashed build assets: cache-first (immutable); fall back to the network and remember it.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
        )
      )
    );
    return;
  }

  // Everything else on our origin (icons, manifest, files with extensions): stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});

// --- Message handler: apply update when user clicks "Update Now" ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// --- Push: display a notification for payloads sent via dispatchPushNotification ---
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Kramasha", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Kramasha";
  const options = {
    body: data.body || "",
    icon: "/kramasha_logo_192x192.png",
    badge: "/kramasha_logo_192x192.png",
    tag: data.tag || "kramasha-notification",
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// --- Notification click: focus an existing tab or open a new one ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        if ("navigate" in existing) existing.navigate(url);
        return null;
      }
      return self.clients.openWindow(url);
    })
  );
});