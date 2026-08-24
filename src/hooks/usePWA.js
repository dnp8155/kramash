// PWA hooks: install prompt, update detection, offline state.
import { useState, useEffect, useCallback } from "react";
import { APP_CONFIG } from "@/lib/appConfig";

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

// Install prompt: captures beforeinstallprompt, exposes trigger, detects iOS.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    // Check if already installed.
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    return choice.outcome === "accepted";
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !installed,
    installed,
    isIOS,
    promptInstall,
    // iOS cannot be auto-prompted — caller should show guidance instead.
    needsIOSGuidance: isIOS && !installed,
  };
}

// Update detection: listens for new service worker, exposes update action.
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg;
    navigator.serviceWorker.register(APP_CONFIG.swPath).catch(() => {});

    const checkUpdate = async () => {
      reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    };
    checkUpdate();

    // Reload when the new SW takes over.
    const controllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);

    // Periodic check (every 10 min).
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
    }, 600000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChange);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    setInstalling(true);
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    // controllerchange listener will reload.
  }, []);

  return { updateAvailable, applyUpdate, installing };
}

// Online/offline state.
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}