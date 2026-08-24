import { cn } from "@/lib/utils";

export default function Toggle({ checked, onChange, className, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40",
        checked ? "bg-[hsl(var(--toggle-on))]" : "bg-muted-foreground/30",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}