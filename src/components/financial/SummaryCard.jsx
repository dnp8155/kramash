import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";

const toneStyles = {
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
  primary: "text-primary",
  default: "text-foreground"
};

export default function SummaryCard({ label, value, tone, currency = "INR", icon: Icon, className }) {
  const valueColor = toneStyles[tone] || toneStyles.default;
  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className={cn("mt-1.5 text-xl font-bold tabular-nums truncate", valueColor)}>
            {formatMoney(value, currency)}
          </div>
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted", valueColor)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}