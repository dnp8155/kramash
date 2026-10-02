import { useState, useEffect } from "react";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { useServiceWorkerUpdate } from "@/hooks/usePWA";
import { APP_CONFIG } from "@/lib/appConfig";
import { useT } from "@/hooks/useT";

export default function UpdateBanner() {
  const t = useT();
  const { updateAvailable, applyUpdate, installing } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (updateAvailable) setDismissed(false);
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-sm flex items-center justify-between gap-3 sticky top-0 z-30">
      <span className="flex items-center gap-2 min-w-0">
        <RefreshCw className="w-4 h-4 shrink-0" />
        <span>
          {t("A new version of Kramasha is available.")} <span className="opacity-80">{t("You are on")} v{APP_CONFIG.version}.</span>
        </span>
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyUpdate}
          disabled={installing}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors font-medium disabled:opacity-70"
        >
          {installing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Updating…")}</> : t("Update now")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("Dismiss")}
          className="w-8 h-8 rounded-full border border-card/40 bg-primary-foreground/10 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
