import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/usePWA";
import { EASE, DURATION, useReducedMotion } from "@/lib/motionVariants";
import { useT } from "@/hooks/useT";

// The inline banner (mounted by AppLayout, pushes the header down) registers itself here so the
// app-wide floating banner (login, onboarding, public pages, loading screens) steps aside and
// only one banner is ever shown.
let inlineMounts = 0;
const inlineListeners = new Set();
const notifyInline = () => inlineListeners.forEach((l) => l());
const subscribeInline = (l) => { inlineListeners.add(l); return () => inlineListeners.delete(l); };
const getInlineMounted = () => inlineMounts > 0;

// floating: fixed to the top of the viewport (for pages outside AppLayout).
export default function OfflineBanner({ floating = false }) {
  const t = useT();
  const online = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const inlineMounted = useSyncExternalStore(subscribeInline, getInlineMounted, () => false);

  useEffect(() => {
    if (floating) return undefined;
    inlineMounts += 1;
    notifyInline();
    return () => { inlineMounts -= 1; notifyInline(); };
  }, [floating]);

  const show = !online && !(floating && inlineMounted);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
          transition={{ duration: DURATION, ease: EASE }}
          className={floating ? "overflow-hidden fixed inset-x-0 top-0 z-[90]" : "overflow-hidden shrink-0"}
          role="status"
        >
          <div className="bg-warning text-warning-foreground px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-sm flex items-center justify-center gap-2 sticky top-0 z-30">
            <WifiOff className="w-4 h-4" />
            {t("You're offline. Some features may be unavailable.")}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
