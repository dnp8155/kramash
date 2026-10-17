import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { getPendingSaves, hasSavingSlot, subscribeSaving } from "@/lib/savingTracker";

const SHOW_AFTER_MS = 400; // quick saves never flash the loader
const MIN_VISIBLE_MS = 700; // once shown, stay long enough to be read

// Fallback "saving" feedback for screens without the app's top bar (public pages, sign-in…): a thin
// bar and pill. Inside the app the top bar's own status capsule is used instead, so this stays hidden.
// Also asks before the tab is closed while a save is still going out, so work isn't lost.
export default function SavingIndicator() {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  const hasSlot = useSyncExternalStore(subscribeSaving, hasSavingSlot, hasSavingSlot);

  useEffect(() => {
    let showTimer;
    let hideTimer;
    const sync = () => {
      if (getPendingSaves() > 0) {
        clearTimeout(hideTimer);
        if (!shownAt.current && !showTimer) {
          showTimer = setTimeout(() => {
            showTimer = null;
            shownAt.current = Date.now();
            setVisible(true);
          }, SHOW_AFTER_MS);
        }
      } else {
        clearTimeout(showTimer);
        showTimer = null;
        if (shownAt.current) {
          const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
          hideTimer = setTimeout(() => { shownAt.current = 0; setVisible(false); }, wait);
        }
      }
    };
    const unsub = subscribeSaving(sync);
    sync();
    return () => { unsub(); clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (getPendingSaves() > 0) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  if (!visible || hasSlot) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[200]">
      <div className="h-[3px] w-full overflow-hidden bg-primary/15">
        <div className="saving-bar h-full w-1/3 rounded-full bg-primary" />
      </div>
      <div className="mt-[calc(0.5rem+env(safe-area-inset-top))] flex justify-center animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Saving… please don't close
        </div>
      </div>
    </div>
  );
}
