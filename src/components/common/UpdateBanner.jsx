// Update banner — shows when a new service worker version is available.
// Clickable: navigates to the App Updates page where the user applies the update manually.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, X, ArrowRight } from "lucide-react";
import { useServiceWorkerUpdate } from "@/hooks/usePWA";

export default function UpdateBanner() {
  const { updateAvailable } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Reset dismissed when a new update appears.
  useEffect(() => {
    if (updateAvailable) setDismissed(false);
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm flex items-center justify-between gap-3 sticky top-0 z-30">
      <span className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        A new version of Kramasha is available.
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate("/app-updates")}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors font-medium"
        >
          View Update <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-primary-foreground/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}