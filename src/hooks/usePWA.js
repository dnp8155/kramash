import { useEffect, useState, useCallback } from "react";
import { APP_CONFIG } from "@/constants/app";

// PWA hook: install prompt, install state, update detection, offline state.
// All values are derived from real browser APIs — no faked states.
export function usePWA() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [swRegistration, setSwRegistration] = useState(null);

  // Detect if already running as installed PWA.
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);
  }, []);

  // Listen for beforeinstallprompt (Chromium browsers).
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Listen for appinstalled event.
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // Online/offline detection.
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Register service worker and detect updates.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;
        setSwRegistration(registration);
        // Check for updates on load.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch(() => {
        // SW registration failed — PWA features unavailable, app still works.
      });

    // Listen for controller change (new SW took over).
    const controllerChange = () => {
      // Controller changed — a new SW is active.
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChange);
    };
  }, []);

  // Trigger the install prompt (Chromium only).
  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) return false;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    return outcome === "accepted";
  }, [installPromptEvent]);

  // Activate the waiting service worker and reload.
  const applyUpdate = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage("SKIP_WAITING");
    }
    // The controllerchange event will fire; force a reload.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [swRegistration]);

  // Check for updates manually.
  const checkForUpdates = useCallback(async () => {
    if (swRegistration) {
      await swRegistration.update();
    }
  }, [swRegistration]);

  return {
    isInstalled,
    canInstall: !!installPromptEvent,
    promptInstall,
    updateAvailable,
    applyUpdate,
    checkForUpdates,
    isOffline,
    swSupported: "serviceWorker" in navigator,
    version: APP_CONFIG.version,
    versionLabel: APP_CONFIG.versionLabel,
  };
}