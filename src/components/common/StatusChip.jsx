import { cn } from "@/lib/utils";

// The green / grey pill in a status card's header ("On", "Installed"…).
export default function StatusChip({ on, children }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
      on ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground/60")} />
      {children}
    </span>
  );
}
