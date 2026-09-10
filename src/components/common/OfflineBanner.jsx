// Offline banner — shows when the browser loses connectivity.
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/usePWA";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 text-sm flex items-center justify-center gap-2 sticky top-0 z-30">
      <WifiOff className="w-4 h-4" />
      You're offline. Some features may be unavailable.
    </div>
  );
}