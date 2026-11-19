import { cn } from "@/lib/utils";
import AnimatedMoney from "@/components/common/AnimatedMoney";
import { useT } from "@/hooks/useT";

export default function FinancialSummaryCards({
  totalRate = 0,
  totalPayments = 0,
  totalRemaining = 0,
  currency = "INR"
}) {
  const t = useT();
  const cards = [
    { label: "Total Rate", value: totalRate, tone: "default" },
    { label: "Total Payments", value: totalPayments, tone: "default" },
    { label: "Total Remaining", value: Math.max(0, totalRemaining), tone: "warning" }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t(c.label)}</div>
          <div className={cn(
            "text-lg font-bold mt-1 tabular-nums",
            c.tone === "warning" ? "text-warning" : "text-foreground"
          )}><AnimatedMoney countUpOnMount={false} value={c.value} currency={currency} /></div>
        </div>
      ))}
    </div>
  );
}