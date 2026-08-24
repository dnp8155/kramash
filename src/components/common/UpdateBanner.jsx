// Update banner — shows when a new service worker version is available.
import { useState, useEffect } from "react";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { useServiceWorkerUpdate } from "@/hooks/usePWA";
import Button from "@/components/common/Button";

export default function UpdateBanner() {
  const { updateAvailable, applyUpdate, installing } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when a new update appears.
  useEffect(() => {
    if (updateAvailable) setDismissed(false);
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm flex items-center justify-between gap-3 sticky top-0 z-30">
      <span className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        A new version of Kramashah is available.
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={applyUpdate}
          disabled={installing}
        >
          {installing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : "Update Now"}
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-primary-foreground/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}