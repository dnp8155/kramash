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
// Holds the page a tapped notification wants (see notificationclick); kept across updates.
const NAV_CACHE = "kramasha-nav-intent";
const NAV_KEY = "/__nav_intent";
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = ["/", OFFLINE_URL, "/manifest.json", "/kramasha_ios_180.png", "/kramasha_ios_192.png", "/kramasha_ios_512.png", "/kramasha_icon_192x192.png", "/kramasha_icon_512x512.png", "/kramasha_maskable_512x512.png", "/kramasha_monochrome_512x512.png", "/kramasha_apple_touch_180x180.png", "/kramasha_logo_192x192.png", "/kramasha_logo_512x512.png", "/icon.svg"];

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
      Promise.all(keys.filter((k) => k !== CACHE && k !== NAV_CACHE).map((k) => caches.delete(k)))
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
    // Full text, never shortened here: Android expands a long body when the notification is pulled down.
    body: data.body || "",
    icon: "/kramasha_logo_192x192.png",
    // Android draws this small status-bar icon from the shape only (alpha), so it must be the one-colour mark, not the coloured logo.
    badge: "/kramasha_monochrome_512x512.png",
    tag: data.tag || "kramasha-notification",
    data: data.data || {},
  };
  // Also set the app icon's number while the app is closed; the app sets the exact unread count when it opens.
  // The server sends the unread count with every push. Without a count (an older server) the badge is left alone:
  // setAppBadge() with no number shows a bare dot (or nothing on iOS) and would replace the number already there.
  const setBadge = async () => {
    const count = Number(data.badge_count);
    if (!Number.isFinite(count) || data.badge_count == null) return;
    try {
      if (count > 0) await self.navigator.setAppBadge?.(Math.floor(count));
      else await self.navigator.clearAppBadge?.();
    } catch { /* unsupported */ }
  };
  event.waitUntil(Promise.all([self.registration.showNotification(title, options), setBadge()]));
});

// --- Notification click: open the page the notification is about ---
// The push carries a path (e.g. /events/123, /leads). If the app is already open it is brought forward and told to go
// there (no reload); if it is closed, it is opened straight on that page. An old open page that cannot answer is
// navigated directly instead.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let path = "/dashboard";
  try {
    const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
    if (target.origin === self.location.origin) path = target.pathname + target.search + target.hash;
  } catch { /* keep the dashboard */ }

  event.waitUntil((async () => {
    // Remember where this tap should go. If the app is closed and the system opens it on its start page whatever
    // address we ask for (iPhone can), the app reads this on load and moves to the right page.
    const nav = await caches.open(NAV_CACHE);
    await nav.put(NAV_KEY, new Response(JSON.stringify({ path, t: Date.now() })));
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = wins.find((c) => { try { return new URL(c.url).origin === self.location.origin; } catch { return false; } });
    if (!open) return self.clients.openWindow(path);
    try { await open.focus(); } catch { /* some platforms refuse; the message below still goes through */ }
    const answered = await new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(false), 600);
      channel.port1.onmessage = () => { clearTimeout(timer); resolve(true); };
      try { open.postMessage({ type: "NOTIFICATION_NAVIGATE", url: path }, [channel.port2]); } catch { clearTimeout(timer); resolve(false); }
    });
    if (answered) return nav.delete(NAV_KEY); // an open app went there itself
    if ("navigate" in open) { try { return await open.navigate(path); } catch { /* fall through */ } }
    return self.clients.openWindow(path);
  })());
});
