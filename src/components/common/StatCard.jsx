import { cn } from "@/lib/utils";

const toneStyles = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-accent/10 text-accent",
  muted: "bg-muted text-muted-foreground"
};

export default function StatCard({ label, value, icon: Icon, tone = "primary", sub, className }) {
  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground truncate">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground truncate">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", toneStyles[tone] || toneStyles.primary)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
    </div>
  );
}