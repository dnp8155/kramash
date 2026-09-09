import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

export default function StatCard({ label, value, icon: Icon, trend, accent = "primary", isCurrency }) {
  const accents = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">
            {isCurrency ? formatCurrency(value) : value}
          </p>
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <p className="mt-2 text-xs font-medium text-muted-foreground">{trend}</p>
      )}
    </div>
  );
}