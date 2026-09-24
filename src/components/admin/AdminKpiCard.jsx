import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminKpiCard({ icon: Icon, label, value, sub, trend, trendUp, accent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accent)}>
          <Icon className="w-4 h-4" />
        </div>
        {typeof trend === "number" && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
            trendUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            <TrendingUp className={cn("w-3 h-3", !trendUp && "rotate-180")} />
            {trendUp ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
      <div className="text-sm font-medium text-foreground/80 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}