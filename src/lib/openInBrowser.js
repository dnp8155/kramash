// Links to our own pages (public profile, inquiry form, job sheet, legal pages…) that open "in a new tab" stay inside
// the installed app: the PWA's scope is the whole site, so the phone opens them in the app window. These helpers hand
// them to the real browser instead: Safari on iPhone/iPad (x-safari-https://, iOS 17+), Chrome on Android (intent://).
// In a normal browser tab nothing changes.

// True inside the installed app (Home Screen / desktop app window), false in a normal browser tab.
export function isInstalledApp() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function browserHandoffUrl(u) {
  if (isIOS()) return `x-safari-${u.href}`;
  if (/Android/i.test(navigator.userAgent || "")) {
    const scheme = u.protocol.replace(":", "");
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
  }
  return null;
}

// Opens a URL in a new browser tab; from the installed app on a phone, in the phone's browser.
export function openInBrowser(url) {
  let u;
  try { u = new URL(url, window.location.href); } catch { return; }
  const handoff = isInstalledApp() && /^https?:$/.test(u.protocol) ? browserHandoffUrl(u) : null;
  if (!handoff) {
    window.open(u.href, "_blank", "noopener,noreferrer");
    return;
  }
  // Older iPhones don't know x-safari-https: if the app is still on screen shortly after, open it the normal way.
  let left = false;
  const onHide = () => { if (document.visibilityState === "hidden") left = true; };
  document.addEventListener("visibilitychange", onHide);
  window.location.href = handoff;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!left && document.visibilityState === "visible") window.open(u.href, "_blank", "noopener,noreferrer");
  }, 900);
}

// One listener for the whole app: a tap on <a target="_blank"> pointing at one of our own pages goes to the browser.
// Links marked data-in-app stay in the app (owner previews that read a password this app saved, which the browser
// can't see). Links to other sites are left alone (WhatsApp, Maps, Instagram open their own apps).
export function initOpenOwnLinksInBrowser() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isInstalledApp()) return;
    const a = e.target instanceof Element ? e.target.closest("a[target='_blank']") : null;
    if (!a || a.hasAttribute("data-in-app") || a.hasAttribute("download")) return;
    let u;
    try { u = new URL(a.getAttribute("href") || "", window.location.href); } catch { return; }
    if (u.origin !== window.location.origin) return;
    e.preventDefault();
    openInBrowser(u.href);
  });
}
