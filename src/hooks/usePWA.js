// PWA hooks: install prompt, update detection, offline state.
import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { APP_CONFIG } from "@/lib/appConfig";
import { detectDevice } from "@/lib/deviceDetect";

// Detects if running as installed PWA.
export function usePwaDisplayMode() {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const check = () => {
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
      );
    };
    check();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", check);
    return () => mq.removeEventListener?.("change", check);
  }, []);
  return installed;
}

// Install prompt. The browser fires `beforeinstallprompt` once, early — so it's captured at
// module level (initInstallCapture, called from main.jsx) and shared by every component,
// instead of each hook instance having to be mounted in time to hear it.
let installSnapshot = { deferred: null, installed: false };
const installListeners = new Set();
let installCaptureStarted = false;

function setInstallSnapshot(patch) {
  installSnapshot = { ...installSnapshot, ...patch };
  installListeners.forEach((l) => l());
}

export function initInstallCapture() {
  if (installCaptureStarted || typeof window === "undefined") return;
  installCaptureStarted = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setInstallSnapshot({ deferred: e });
  });
  window.addEventListener("appinstalled", () => setInstallSnapshot({ installed: true, deferred: null }));
  if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
    setInstallSnapshot({ installed: true });
  }
}

const subscribeInstall = (cb) => { installListeners.add(cb); return () => installListeners.delete(cb); };
const getInstallSnapshot = () => installSnapshot;

// Exposes the shared install state + trigger; iOS (which can't be prompted) is reported so
// callers show the guided steps instead. Includes iPadOS, which identifies as a Mac.
export function useInstallPrompt() {
  initInstallCapture();
  const { deferred, installed } = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const env = detectDevice();
  const isIOS = env.family === "ios";

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setInstallSnapshot(choice.outcome === "accepted" ? { installed: true, deferred: null } : { deferred: null });
    return choice.outcome === "accepted";
  }, [deferred]);

  return {
    canInstall: !!deferred && !installed,
    installed,
    isIOS,
    promptInstall,
    // iOS cannot be auto-prompted — caller should show guidance instead.
    needsIOSGuidance: isIOS && !installed,
  };
}

// Set only when the user taps "Update now". A new service worker taking over on its own
// (e.g. one that finished installing after the connection came back) must NOT reload
// the page underneath them.
let updateRequestedByUser = false;

// Flag read by WhatsNewDialog after the reload, so the sheet shows once the update is applied.
export const UPDATE_APPLIED_KEY = "kramasha_update_applied";
// When the user last tapped "Update now". The startup splash says "Updating Kramasha…" (instead of
// "Loading your workspace…") for a couple of minutes after that — long enough for the reload to finish,
// short enough that a stale value can never keep the wording around. (index.html repeats this check.)
export const UPDATE_APPLIED_AT_KEY = "kramasha_update_applied_at";
export function justUpdatedRecently() {
  try {
    const at = Number(localStorage.getItem(UPDATE_APPLIED_AT_KEY));
    return at > 0 && Date.now() - at < 2 * 60 * 1000;
  } catch { return false; }
}

// Shared store: the banner and the App Updates page see the same state. The banner is for a
// waiting (not yet applied) update only — once applied, the page reloads on the new version
// with nothing waiting, so the banner is gone and the What's New sheet takes over.
// critical / checked: whether the waiting update is a critical fix (public/release.json), and whether that has been
// looked up yet — the banner waits for the answer so it never flashes before a quiet update.
let swState = { updateAvailable: false, installing: false, critical: false, checked: false };
const swListeners = new Set();
let swStarted = false;

function setSwState(patch) {
  swState = { ...swState, ...patch };
  swListeners.forEach((l) => l());
}

// ---- Quiet critical updates ----
// A release whose public/release.json says { "critical": true } is applied without the banner or the What's New sheet,
// at the first SAFE moment: the app goes to the background, the app was only just opened, or nobody has touched it
// for a minute. Never while a dialog is open, a field is being typed in, or a page has unsaved changes.
const pageLoadedAt = Date.now();
let lastTouch = Date.now();

// Set when another window already applied the update: this window then only reloads quietly, and a release.json
// answer still on its way must not turn the banner back on.
let appliedElsewhere = false;

async function lookUpCritical() {
  try {
    const res = await fetch(`/release.json?t=${Date.now()}`, { cache: "no-store" });
    const info = res.ok ? await res.json() : null;
    setSwState({ critical: appliedElsewhere || info?.critical === true, checked: true });
  } catch {
    setSwState({ critical: appliedElsewhere, checked: true }); // can't tell: show the banner as usual
  }
  if (swState.critical) tryQuietUpdate();
}

function safeToReload() {
  if (typeof document === "undefined") return false;
  if ((window.__kramashaUnsaved || 0) > 0) return false;
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return false;
  const el = document.activeElement;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return false;
  return true;
}

async function applyQuietly() {
  updateRequestedByUser = true; // the controllerchange listener reloads; no banner, no What's New sheet
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  } catch { window.location.reload(); }
}

// ---- Latest version before paying ----
// Buying or renewing Pro happens only on the newest app, so plan rules, prices and wording are current. Your Plan checks
// quietly in the background when it opens: if a newer version exists, it says so and the payment buttons wait until the
// person taps "Update now" (the page reloads on the new version). Offline or no service worker: nothing to check.
export const UPDATED_FOR_PAYMENT_KEY = "kramasha:updated-for-payment";
const settle = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

// "latest" → fine; "update" → a newer version is ready to switch to; "downloading" → a newer version is still arriving.
export async function checkAppVersion({ dev = import.meta.env.DEV } = {}) {
  if (dev || typeof window === "undefined" || !("serviceWorker" in navigator)) return "latest";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !navigator.serviceWorker.controller) return "latest"; // first visit: already the newest files
    if (!reg.waiting && !reg.installing) await settle(reg.update().catch(() => {}), 6000);
    if (reg.waiting) return "update";
    if (reg.installing) return "downloading";
  } catch { /* can't check (e.g. offline): the payment itself will tell */ }
  return "latest";
}

// "Update now" on Your Plan: switch to the waiting version (the page reloads there and says it's ready).
export async function applyAppUpdateForPayment() {
  try { sessionStorage.setItem(UPDATED_FOR_PAYMENT_KEY, "1"); } catch { /* the note after reload is optional */ }
  await applyQuietly();
}

// Safe moments: the app is in the background, it was opened in the last 15 seconds, or nobody touched it for a minute.
function tryQuietUpdate() {
  if (!swState.updateAvailable || !swState.critical || swState.installing) return;
  const hidden = document.visibilityState === "hidden";
  const justOpened = Date.now() - pageLoadedAt < 15000;
  const idle = Date.now() - lastTouch > 60000;
  if ((hidden || justOpened || idle) && safeToReload()) applyQuietly();
}

function startQuietWatch() {
  const touch = () => { lastTouch = Date.now(); };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => window.addEventListener(ev, touch, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") tryQuietUpdate();
    // Back in the app: look for a new version straight away (not only every 5 minutes).
    else navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  });
  setInterval(tryQuietUpdate, 15000);
}

function startServiceWorkerWatch() {
  if (swStarted || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return; // Don't register SW in dev — stale caches break HMR
  swStarted = true;

  const markWaiting = (reg) => {
    // Only counts as an update if an older worker is currently controlling the page.
    if (reg?.waiting && navigator.serviceWorker.controller && !swState.updateAvailable) { setSwState({ updateAvailable: true }); lookUpCritical(); }
  };

  const watch = (reg) => {
    if (!reg) return;
    markWaiting(reg);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          // New SW is waiting — notify the user (or, for a critical fix, apply it quietly at a safe moment).
          setSwState({ updateAvailable: true, checked: false });
          lookUpCritical();
        }
      });
    });
  };

  navigator.serviceWorker.register(APP_CONFIG.swPath).then(watch).catch(() => {});
  navigator.serviceWorker.getRegistration().then(watch).catch(() => {});

  // Reload only when the user (or a quiet critical update) asked for it. When ANOTHER tab/window applied the update,
  // this one is still running the old version whose files were just removed from the cache: offer the reload
  // (the banner's "Update now" simply reloads), or do it quietly for a critical fix.
  // The very first install also "changes the controller" (none → this one): that is not an update.
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updateRequestedByUser) { window.location.reload(); return; }
    if (!hadController) { hadController = true; return; }
    // Another window already applied this update (the user tapped "Update now" there), so asking again here is the
    // repeat banner users saw 2-3 times. Treat it like a quiet update: reload at the next safe moment, no banner.
    appliedElsewhere = true;
    setSwState({ updateAvailable: true, critical: true, checked: true });
    tryQuietUpdate();
  });
  startQuietWatch();

  // Check for updates every 5 min.
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  }, 300000);
}

const subscribeSw = (cb) => { swListeners.add(cb); return () => swListeners.delete(cb); };
const getSwState = () => swState;

// Update detection: listens for a new service worker; applying it is always the user's call.
export function useServiceWorkerUpdate() {
  useEffect(() => { startServiceWorkerWatch(); }, []);
  const { updateAvailable: waiting, installing, critical, checked } = useSyncExternalStore(subscribeSw, getSwState, getSwState);
  // The banner only for a normal update, and only once release.json has answered (a critical one is applied quietly).
  const updateAvailable = waiting && checked && !critical;

  const applyUpdate = useCallback(async () => {
    setSwState({ installing: true });
    updateRequestedByUser = true;
    try {
      localStorage.setItem(UPDATE_APPLIED_KEY, "1");
      localStorage.setItem(UPDATE_APPLIED_AT_KEY, String(Date.now()));
    } catch { /* storage unavailable */ }
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
    // controllerchange listener will reload.
  }, []);

  return { updateAvailable, applyUpdate, installing };
}

// Online/offline state.
// navigator.onLine and the online/offline events are unreliable on their own (iOS Safari
// often never fires them; a VPN/Ethernet adapter staying up keeps onLine true), so this
// actively checks reachability: two tiny requests in parallel — a Google 204 and a HEAD of
// our own site — and we're online if EITHER answers (so a blocked domain can't fake
// "offline"). Checked every 2s while online and every 1.5s while offline, so the banner
// appears within ~3-5s of losing the connection and clears within ~3s of getting it back.
// Polling pauses while the tab is hidden and re-checks the moment it's visible again.
const PROBE_TIMEOUT_MS = 2500;
const ONLINE_POLL_MS = 2000;
const OFFLINE_POLL_MS = 1500;

async function checkReachable() {
  const attempt = async (url, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      await fetch(url, { cache: "no-store", signal: controller.signal, ...init });
      return true;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    await Promise.any([
      attempt("https://www.gstatic.com/generate_204", { mode: "no-cors" }),
      attempt("/manifest.json", { method: "HEAD" }),
    ]);
    return true;
  } catch {
    return false;
  }
}

// Shared store: a single probe loop, started with the first subscriber and stopped with the last,
// so the inline and floating banners never double the probe traffic.
let onlineState = typeof navigator === "undefined" ? true : navigator.onLine;
const onlineListeners = new Set();
let stopLoop = null;

function setOnlineState(value) {
  if (value === onlineState) return;
  onlineState = value;
  onlineListeners.forEach((l) => l());
}

function startOnlineLoop() {
  let cancelled = false;
  let timer = null;

  const tick = async () => {
    clearTimeout(timer);
    if (cancelled) return;
    if (document.visibilityState === "hidden") return; // resumes on visibilitychange
    const ok = await checkReachable();
    if (cancelled) return;
    setOnlineState(ok);
    timer = setTimeout(tick, ok ? ONLINE_POLL_MS : OFFLINE_POLL_MS);
  };

  const onOffline = () => setOnlineState(false);
  const onOnline = () => tick(); // don't trust the event alone — confirm, then clear the banner
  const onVisible = () => { if (document.visibilityState === "visible") tick(); };
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  tick();

  return () => {
    cancelled = true;
    clearTimeout(timer);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function subscribeOnline(listener) {
  onlineListeners.add(listener);
  if (!stopLoop) stopLoop = startOnlineLoop();
  return () => {
    onlineListeners.delete(listener);
    if (onlineListeners.size === 0 && stopLoop) {
      stopLoop();
      stopLoop = null;
    }
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, () => onlineState, () => true);
}
