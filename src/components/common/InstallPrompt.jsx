import { useState, useEffect } from "react";
import { X, Download, Smartphone, Laptop } from "lucide-react";
import { useInstallPrompt } from "@/hooks/usePWA";
import { detectDevice } from "@/lib/deviceDetect";
import InstallDialog from "@/components/common/InstallDialog";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

// A small nudge (bottom of the screen on phones, bottom-right on desktop). Tapping it opens
// the install sheet with steps for the device the person is actually on.
// Shown when the browser offers a one-tap install, or on iPhone/iPad (which can't be
// prompted and needs the Share → Add to Home Screen steps).
export default function InstallPrompt() {
  const t = useT();
  const { canInstall, installed, needsIOSGuidance, promptInstall } = useInstallPrompt();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const env = detectDevice();

  useEffect(() => {
    if (installed) { setShow(false); return; }
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed, 10)) / 86400000;
      if (days < DISMISS_DAYS) return;
    }
    if (canInstall || needsIOSGuidance) setShow(true);
  }, [canInstall, needsIOSGuidance, installed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  };

  if (installed) return null;

  const isDesktop = env.family === "desktop";
  const Icon = isDesktop ? Laptop : Smartphone;

  return (
    <>
      {show && (
        <div className="fixed bottom-24 inset-x-3 lg:bottom-6 lg:right-6 lg:left-auto lg:inset-x-auto lg:w-[380px] z-40 animate-fade-in">
          <div className="relative bg-card border border-border rounded-[15px] shadow-lg p-4">
            <button
              onClick={dismiss}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={t("Dismiss")}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{t("Install Kramasha")}</div>
                <div className="text-xs text-muted-foreground">{t("Quick, full-screen access on your")} {env.label.split(" · ")[0]}</div>
              </div>
            </div>
            <Button className="w-full mt-3" onClick={() => setOpen(true)}>
              <Download className="w-4 h-4" /> {canInstall ? t("Install") : t("Show me how")}
            </Button>
          </div>
        </div>
      )}
      <InstallDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v && show && installed) setShow(false); }}
        canInstall={canInstall}
        onInstall={async () => { const ok = await promptInstall(); if (ok) setShow(false); return ok; }}
      />
    </>
  );
}
