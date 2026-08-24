import { cn } from "@/lib/utils";

const toneStyles = {
  primary: {
    iconWrap: "bg-primary/10 text-primary",
    accent: "from-primary/80 to-primary/0",
    value: "text-foreground"
  },
  success: {
    iconWrap: "bg-success/10 text-success",
    accent: "from-success/80 to-success/0",
    value: "text-success"
  },
  warning: {
    iconWrap: "bg-warning/10 text-warning",
    accent: "from-warning/80 to-warning/0",
    value: "text-warning"
  },
  danger: {
    iconWrap: "bg-destructive/10 text-destructive",
    accent: "from-destructive/80 to-destructive/0",
    value: "text-destructive"
  },
  info: {
    iconWrap: "bg-accent/10 text-accent",
    accent: "from-accent/80 to-accent/0",
    value: "text-foreground"
  },
  muted: {
    iconWrap: "bg-muted text-muted-foreground",
    accent: "from-border to-border/0",
    value: "text-foreground"
  }
};

export default function StatCard({ label, value, icon: Icon, tone = "primary", sub, className }) {
  const styles = toneStyles[tone] || toneStyles.primary;
  return (
    <div className={cn(
      "relative bg-card border border-border rounded-xl p-4 shadow-card overflow-hidden",
      "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
      className
    )}>
      {/* Top accent gradient strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", styles.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className={cn("mt-1.5 text-2xl font-bold tabular-nums truncate", styles.value)}>{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground truncate">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", styles.iconWrap)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}