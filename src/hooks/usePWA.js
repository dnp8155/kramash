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

// Shared store: the banner and the App Updates page see the same state. The banner is for a
// waiting (not yet applied) update only — once applied, the page reloads on the new version
// with nothing waiting, so the banner is gone and the What's New sheet takes over.
let swState = { updateAvailable: false, installing: false };
const swListeners = new Set();
let swStarted = false;

function setSwState(patch) {
  swState = { ...swState, ...patch };
  swListeners.forEach((l) => l());
}

function startServiceWorkerWatch() {
  if (swStarted || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return; // Don't register SW in dev — stale caches break HMR
  swStarted = true;

  const markWaiting = (reg) => {
    // Only counts as an update if an older worker is currently controlling the page.
    if (reg?.waiting && navigator.serviceWorker.controller) setSwState({ updateAvailable: true });
  };

  const watch = (reg) => {
    if (!reg) return;
    markWaiting(reg);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          // New SW is waiting — notify the user but don't auto-apply.
          setSwState({ updateAvailable: true });
        }
      });
    });
  };

  navigator.serviceWorker.register(APP_CONFIG.swPath).then(watch).catch(() => {});
  navigator.serviceWorker.getRegistration().then(watch).catch(() => {});

  // Reload only when the user asked for the update.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updateRequestedByUser) window.location.reload();
  });

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
  const { updateAvailable, installing } = useSyncExternalStore(subscribeSw, getSwState, getSwState);

  const applyUpdate = useCallback(async () => {
    setSwState({ installing: true });
    updateRequestedByUser = true;
    try { localStorage.setItem(UPDATE_APPLIED_KEY, "1"); } catch { /* storage unavailable */ }
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
