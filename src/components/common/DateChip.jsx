import { cn } from "@/lib/utils";

// The rounded date pill used on the event details page ("12 Oct", with the year when it isn't this year).
// `muted` is the struck-through look for an excluded date.
export default function DateChip({ date, dotClass, muted = false, className, children }) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" });
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
      muted ? "bg-muted text-muted-foreground/60 border-border line-through" : "bg-primary/10 text-primary border-primary/20",
      className
    )}>
      {dotClass && <span className={cn("status-dot w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />}
      {d.getDate()} {month}{sameYear ? "" : ` ${d.getFullYear()}`}
      {children}
    </span>
  );
}
