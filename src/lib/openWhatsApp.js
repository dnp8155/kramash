import { isInstalledApp } from "@/lib/openInBrowser";

// WhatsApp from the installed app (Home Screen app on iPhone/Android): a wa.me link opens an in-app browser sheet
// first, which hands over to WhatsApp and stays behind as an empty sheet with an ✕ (seen on iPhone). Going straight
// to WhatsApp's own whatsapp:// link skips that sheet. In a normal browser tab nothing changes (wa.me as before).

const isMobile = () => {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod|Android/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

// wa.me/<number>?text=… or api.whatsapp.com/send?phone=…&text=… → whatsapp://send?phone=…&text=…
// Returns null for anything that isn't a WhatsApp chat/share link (e.g. a channel or group invite).
export function whatsappAppUrl(url) {
  let u;
  try { u = new URL(url, typeof window !== "undefined" ? window.location.href : undefined); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");
  let phone = "";
  if (host === "wa.me") {
    phone = u.pathname.replace(/\//g, "").replace(/^\+/, ""); // wa.me/+91… typed by hand
    if (phone && !/^\d+$/.test(phone)) return null; // wa.me/message/…, wa.me/qr/… etc.
  } else if (host === "api.whatsapp.com" && u.pathname.replace(/\/$/, "") === "/send") {
    phone = (u.searchParams.get("phone") || "").replace(/\D/g, "");
  } else {
    return null;
  }
  const text = u.searchParams.get("text");
  const params = [];
  if (phone) params.push(`phone=${phone}`);
  if (text) params.push(`text=${encodeURIComponent(text)}`);
  return `whatsapp://send${params.length ? `?${params.join("&")}` : ""}`;
}

// Opens a WhatsApp chat/share link. Use instead of window.open(waUrl, "_blank").
export function openWhatsApp(url) {
  const app = isInstalledApp() && isMobile() ? whatsappAppUrl(url) : null;
  if (!app) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // WhatsApp not installed: the whatsapp:// link does nothing. If the app plainly stayed in front, open wa.me the
  // usual way (its page offers to download WhatsApp). Leaving in any form, or a timer that fired late (the app was
  // paused while WhatsApp was in front), means WhatsApp opened: no second try.
  let left = false;
  const startedAt = Date.now();
  const onLeave = () => { left = true; };
  const onVis = () => { if (document.visibilityState === "hidden") left = true; };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onLeave);
  window.addEventListener("blur", onLeave);
  window.location.href = app;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onLeave);
    window.removeEventListener("blur", onLeave);
    const late = Date.now() - startedAt > 3000;
    // Same-window navigation: iPhone blocks window.open this long after the tap, but not this (wa.me then opens in
    // the system's own sheet, which offers to install WhatsApp).
    if (!left && !late && document.visibilityState === "visible") window.location.href = url;
  }, 2500);
}

// One listener for plain WhatsApp links (<a href="https://wa.me/…">) anywhere in the app: same direct handoff.
export function initWhatsAppLinks() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isInstalledApp() || !isMobile()) return;
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!a || !whatsappAppUrl(a.href)) return;
    e.preventDefault();
    openWhatsApp(a.href);
  });
}
