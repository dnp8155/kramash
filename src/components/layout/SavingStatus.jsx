import { Loader2 } from "lucide-react";
import { useT } from "@/hooks/useT";

// The capsule that fades in over the search bar (same size and spot) while something is saving, then
// fades back out. Purely visual: the search box underneath is untouched.
export default function SavingStatus({ phase }) {
  const t = useT();
  const active = phase !== "idle";
  const label = phase === "starting" ? t("Starting…") : phase === "updating" ? t("Updating…") : t("Saving changes…");
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border bg-card transition-all duration-300 ease-out ${
        active ? "opacity-100 scale-100 border-primary/30" : "opacity-0 scale-[0.98] border-transparent"
      }`}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-primary/[0.06]" />
      <div aria-hidden="true" className="saving-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      <div className="relative flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}
