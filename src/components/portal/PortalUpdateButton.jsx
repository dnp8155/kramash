import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motionVariants";

// Floating "New update" pill for the portals: hidden while nothing changed, slides in at the bottom right when the
// business changed something, reads "Updating…" while the new details load, then slides away. Frosted like the
// app's bottom menu bar (glass-nav: see-through with blur, thin border, soft shadow) and clear of the iPhone home bar.
export default function PortalUpdateButton({ show, busy, onClick }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {(show || busy) && (
        <motion.button
          key="portal-update"
          type="button"
          onClick={onClick}
          disabled={busy}
          aria-label={busy ? "Updating" : "New update, tap to refresh"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "fixed z-40 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] h-12 pl-4 pr-[18px] rounded-full",
            "inline-flex items-center gap-2 text-sm font-semibold glass-nav border border-primary/30 text-primary",
            "shadow-[0_6px_20px_rgba(15,23,42,0.10),0_1px_2px_rgba(15,23,42,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          {!busy && (
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-40 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          <RefreshCw className={cn("w-[18px] h-[18px] shrink-0", busy && "animate-spin")} aria-hidden="true" />
          {busy ? "Updating…" : "New update"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
