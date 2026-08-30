import { useState, useEffect } from "react";
import { useInstallPrompt } from "@/hooks/usePWA";
import { Download, Share, X, Plus, Smartphone } from "lucide-react";
import Button from "@/components/common/Button";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
  const { canInstall, installed, isIOS, promptInstall, needsIOSGuidance } = useInstallPrompt();
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (installed) return;
    if (window.innerWidth >= 1024) return; // desktop has its own install UI
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

  const handleInstall = async () => {
    setInstalling(true);
    const ok = await promptInstall();
    setInstalling(false);
    if (ok) setShow(false);
  };

  if (!show || installed) return null;

  return (
    <div className="lg:hidden fixed bottom-20 inset-x-3 z-40 animate-fade-in">
      <div className="relative bg-card border border-border rounded-2xl shadow-lg p-4">
        <button
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 pr-6">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Install App</div>
            <div className="text-xs text-muted-foreground">Add to your home screen for quick access</div>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-2.5 mt-3">
            <div className="flex items-start gap-2.5 text-xs text-foreground">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-muted-foreground">1</span>
              <div className="flex items-center gap-1 pt-0.5">
                Tap the
                <Share className="w-4 h-4 text-primary inline" />
                Share button in Safari
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-foreground">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-muted-foreground">2</span>
              <div className="pt-0.5">Select <span className="font-semibold">"Add to Home Screen"</span></div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-foreground">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-muted-foreground">3</span>
              <div className="pt-0.5">Tap <span className="font-semibold">Add</span> — done!</div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={dismiss}>
              Got it
            </Button>
          </div>
        ) : (
          <Button className="w-full mt-3" onClick={handleInstall} disabled={installing}>
            <Download className="w-4 h-4" />
            {installing ? "Installing…" : "Install Now"}
          </Button>
        )}
      </div>
    </div>
  );
}