import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatMoney, formatMoneyCompact } from "@/utils/format";
import { useT } from "@/hooks/useT";
import ChartCard from "@/components/common/ChartCard";
import {
  CHART_PRIMARY, CHART_DESTRUCTIVE, CHART_MARGIN, CHART_TICK, CHART_GRID, CHART_Y_AXIS_WIDTH, CHART_TOOLTIP, CHART_LINE, chartDot,
} from "@/lib/chartTheme";

// Each series has its own line colour; the switches double as the legend.
const SERIES = [
  { key: "received", label: "Received", color: CHART_PRIMARY, gradId: "recvGrad" },
  { key: "paid", label: "Paid", color: CHART_DESTRUCTIVE, gradId: "paidGrad" },
];

export default function RevenueTrendChart({ data = [], currency = "INR", isLoading }) {
  const t = useT();
  const navigate = useNavigate();
  const [visible, setVisible] = useState({ received: true, paid: true });

  // Never allow both off — an empty chart explains nothing.
  const toggle = (key) =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      return next.received || next.paid ? next : v;
    });

  return (
    <ChartCard
      icon={TrendingUp}
      title={t("Payments")}
      subtitle={t("Last 6 months")}
      action={
        <button type="button" onClick={() => navigate("/financial?tab=reports")} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          {t("Report")} <ArrowRight className="w-3 h-3" />
        </button>
      }
      series={SERIES.map((s) => ({ ...s, label: t(s.label) }))}
      visible={visible}
      onToggle={toggle}
      isLoading={isLoading}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.gradId} id={s.gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} width={CHART_Y_AXIS_WIDTH} tickFormatter={(v) => formatMoneyCompact(v, currency)} />
          <Tooltip {...CHART_TOOLTIP} formatter={(v, name) => [formatMoney(v, currency), t(name === "paid" ? "Paid" : "Received")]} />
          {SERIES.filter((s) => visible[s.key]).map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} {...CHART_LINE} fill={`url(#${s.gradId})`} dot={chartDot(s.color)} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
