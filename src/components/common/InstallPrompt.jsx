import { useState, useEffect, useRef } from "react";
import { useInstallPrompt } from "@/hooks/usePWA";
import InstallDialog from "@/components/common/InstallDialog";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;
const OPEN_DELAY_MS = 4000; // let the page settle before asking
const RETRY_MS = 3000;

const recentlyDismissed = () => {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    return !!at && (Date.now() - parseInt(at, 10)) / 86400000 < DISMISS_DAYS;
  } catch { return false; }
};

// When the app is opened in a browser (not installed) and the device can install it, show the install
// sheet itself so it can't be missed: steps for the device the person is on, or a one-tap Install where
// the browser offers it. Shown at most once per page load, never on top of another dialog, and not
// again for a week after it is closed.
export default function InstallPrompt() {
  const { canInstall, installed, needsIOSGuidance, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    if (installed) { setOpen(false); return undefined; }
    if (shownOnce.current || !(canInstall || needsIOSGuidance) || recentlyDismissed()) return undefined;

    let timer;
    const tryOpen = () => {
      // Another dialog (What's new, a confirm, a form) is up: wait for it instead of stacking on top.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) { timer = setTimeout(tryOpen, RETRY_MS); return; }
      shownOnce.current = true;
      setOpen(true);
    };
    timer = setTimeout(tryOpen, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canInstall, needsIOSGuidance, installed]);

  const onOpenChange = (v) => {
    setOpen(v);
    if (!v) { try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch { /* ignore */ } }
  };

  if (installed) return null;

  return (
    <InstallDialog
      open={open}
      onOpenChange={onOpenChange}
      canInstall={canInstall}
      onInstall={async () => { const ok = await promptInstall(); if (ok) setOpen(false); return ok; }}
      closeLabel="Not now"
    />
  );
}
