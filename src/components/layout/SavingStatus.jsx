import { Loader2, CircleCheck, CloudDownload, CloudOff } from "lucide-react";
import { useT } from "@/hooks/useT";

// The capsule that fades in over the search bar (same size and spot) while something is saving or syncing, then
// fades back out. Purely visual: the search box underneath is untouched.
// Phases: "starting" | "saving" | "syncing" (spinner) · "synced" (tick) · "unsynced" (could not refresh).
export default function SavingStatus({ phase }) {
  const t = useT();
  const active = phase !== "idle";
  const label = phase === "syncing" ? t("Syncing…")
    : phase === "synced" ? t("Synced")
    : phase === "unsynced" ? t("Not synced")
    : null; // saving shows just the loader
  const unsynced = phase === "unsynced";
  const done = phase === "synced";
  // Sync words get cloud icons (pulsing cloud while syncing, tick in a circle when done, crossed cloud when not); saving keeps the spinner.
  const icon = unsynced ? <CloudOff className="h-4 w-4 text-warning" />
    : done ? <CircleCheck className="h-4 w-4 text-success" />
    : phase === "syncing" ? <CloudDownload className="h-4 w-4 animate-pulse text-primary" />
    : <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border bg-card transition-all duration-300 ease-out ${
        active ? `opacity-100 scale-100 ${unsynced ? "border-warning/40" : "border-primary/30"}` : "opacity-0 scale-[0.98] border-transparent"
      }`}
    >
      <div aria-hidden="true" className={`absolute inset-0 ${unsynced ? "bg-warning/[0.08]" : "bg-primary/[0.06]"}`} />
      {!done && !unsynced && <div aria-hidden="true" className="saving-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />}
      <div className="relative flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label ? <span className="truncate">{label}</span> : <span className="sr-only">{t("Updating…")}</span>}
      </div>
    </div>
  );
}
