import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Offline banner: shows when the browser loses network connectivity.
// Does not fake any state — purely driven by the browser's online/offline events.
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  if (!isOffline) return null;

  return (
    <div className="border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-warning">
        <WifiOff className="h-4 w-4" /> You're offline. Some features may be unavailable.
      </p>
    </div>
  );
}