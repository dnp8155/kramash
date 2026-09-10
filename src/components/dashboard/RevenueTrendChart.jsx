import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { useT } from "@/hooks/useT";

export default function RevenueTrendChart({ data = [], currency = "INR", isLoading }) {
  const t = useT();

  return (
    <div className="bg-card border border-border rounded-xl shadow-card h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("Payments Received")}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{t("Last 6 months")}</span>
      </div>

      <div className="p-4 h-64">
        {isLoading ? (
          <div className="h-full w-full rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => formatMoney(v, currency).replace(/\.\d+/, "")}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))"
                }}
                formatter={(v) => [formatMoney(v, currency), t("Received")]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#revGrad)"
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}