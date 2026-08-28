import { cn } from "@/lib/utils";

const toneStyles = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-accent/10 text-accent",
  muted: "bg-muted text-muted-foreground"
};

const toneBars = {
  primary: "from-primary/60 to-accent/40",
  success: "from-success/60 to-success/20",
  warning: "from-warning/60 to-warning/20",
  danger: "from-destructive/60 to-destructive/20",
  info: "from-accent/60 to-primary/30",
  muted: "from-muted-foreground/40 to-muted"
};

export default function StatCard({ label, value, icon: Icon, tone = "primary", sub, className }) {
  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card hover-lift hover:shadow-card-hover hover:border-border/80 overflow-hidden group",
        className
      )}
    >
      {/* Top accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", toneBars[tone] || toneBars.primary)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl sm:text-[1.75rem] font-bold tabular-nums text-foreground leading-none truncate">{value}</div>
          {sub && <div className="mt-1.5 text-xs text-muted-foreground truncate">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", toneStyles[tone] || toneStyles.primary)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}