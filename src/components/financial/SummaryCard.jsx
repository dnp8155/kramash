import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";

const toneStyles = {
  success: { value: "text-success", accent: "from-success/80 to-success/0" },
  destructive: { value: "text-destructive", accent: "from-destructive/80 to-destructive/0" },
  warning: { value: "text-warning", accent: "from-warning/80 to-warning/0" },
  primary: { value: "text-primary", accent: "from-primary/80 to-primary/0" },
  default: { value: "text-foreground", accent: "from-border to-border/0" }
};

export default function SummaryCard({ label, value, tone, currency = "INR", icon: Icon, className }) {
  const styles = toneStyles[tone] || toneStyles.default;
  return (
    <div className={cn(
      "relative bg-card border border-border rounded-xl p-4 shadow-card overflow-hidden",
      "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
      className
    )}>
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", styles.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className={cn("mt-1.5 text-xl font-bold tabular-nums truncate", styles.value)}>
            {formatMoney(value, currency)}
          </div>
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/60", styles.value)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}