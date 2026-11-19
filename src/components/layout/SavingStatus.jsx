import { Loader2, CircleCheck, CloudDownload, CloudOff } from "lucide-react";
import { useT } from "@/hooks/useT";

// A small round icon to the right of the search bar while something is saving or syncing. It is only there for
// transparency, so it stays quiet: no words, no shimmer. The search bar never goes away; on phones it makes a little
// room as the icon slides in and takes it back when the icon leaves. From lg up the icon sits outside the bar, so
// nothing moves at all. The words ("Syncing…", "Synced"…) are the tooltip and the screen-reader text.
// Phases: "starting" | "saving" | "syncing" (spinner / pulsing cloud) · "synced" (tick) · "unsynced" (could not refresh).
export default function SavingStatus({ phase }) {
  const t = useT();
  const active = phase !== "idle";
  const label = phase === "syncing" ? t("Syncing…")
    : phase === "synced" ? t("Synced")
    : phase === "unsynced" ? t("Not synced")
    : t("Updating…");
  const unsynced = phase === "unsynced";
  const done = phase === "synced";
  // All four icons sit on top of each other; the one for the current phase turns and scales in while the others fade
  // out, so the icon morphs (spinner to tick, cloud to cloud-off) instead of snapping.
  const current = unsynced ? "unsynced" : done ? "synced" : phase === "syncing" ? "syncing" : "saving";
  const layer = (name) => `absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none ${current === name ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90"}`;
  const icon = (
    <span className="relative block h-4 w-4">
      <span className={layer("saving")}><Loader2 className="h-4 w-4 animate-spin text-primary" /></span>
      <span className={layer("syncing")}><CloudDownload className="h-4 w-4 animate-pulse text-primary" /></span>
      <span className={layer("synced")}><CircleCheck className="h-4 w-4 text-success" /></span>
      <span className={layer("unsynced")}><CloudOff className="h-4 w-4 text-warning" /></span>
    </span>
  );
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!active}
      title={active ? label : undefined}
      // Phones: the slot's width and margin open and close (the search bar gives way). lg+: a fixed spot just outside the bar.
      style={{ "--slot-w": active ? "36px" : "0px", "--slot-m": active ? "8px" : "0px", transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
      className={`pointer-events-none shrink-0 h-9 w-[var(--slot-w)] ml-[var(--slot-m)] lg:absolute lg:left-full lg:top-0.5 lg:w-9 lg:ml-2 overflow-hidden rounded-full border bg-card flex items-center justify-center transition-[width,margin,opacity,transform,border-color] duration-500 motion-reduce:transition-none ${
        active ? `opacity-100 scale-100 ${unsynced ? "border-warning/40" : "border-border"}` : "opacity-0 scale-90 border-transparent"
      }`}
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
