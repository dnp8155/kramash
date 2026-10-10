import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatMoney, formatMoneyCompact } from "@/utils/format";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

const PRIMARY = "hsl(var(--primary-strong, var(--primary)))";
const DESTRUCTIVE = "hsl(var(--destructive))";

// Each series has its own line colour; the switches double as the legend.
const SERIES = [
  { key: "received", label: "Received", color: PRIMARY, gradId: "recvGrad" },
  { key: "paid", label: "Paid", color: DESTRUCTIVE, gradId: "paidGrad" },
];

export default function RevenueTrendChart({ data = [], currency = "INR", isLoading }) {
  const t = useT();
  const [visible, setVisible] = useState({ received: true, paid: true });

  // Never allow both off — an empty chart explains nothing.
  const toggle = (key) =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      return next.received || next.paid ? next : v;
    });

  return (
    <div className="bg-card border border-border rounded-[15px] shadow-card h-full">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("Payments")}</h3>
          <span className="text-xs text-muted-foreground">· {t("Last 6 months")}</span>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label={t("Payments")}>
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={visible[s.key]}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                visible[s.key]
                  ? "border-border bg-card text-foreground"
                  : "border-transparent bg-muted text-muted-foreground"
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: visible[s.key] ? s.color : "transparent", border: `1.5px solid ${s.color}` }}
              />
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 h-64">
        {isLoading ? (
          <div className="h-full w-full rounded-lg bg-muted/40 skeleton-shimmer" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.gradId} id={s.gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
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
                width={60}
                tickFormatter={(v) => formatMoneyCompact(v, currency)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))"
                }}
                formatter={(v, name) => [formatMoney(v, currency), t(name === "paid" ? "Paid" : "Received")]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 600 }}
              />
              {SERIES.filter((s) => visible[s.key]).map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill={`url(#${s.gradId})`}
                  dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
