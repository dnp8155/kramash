import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/format";

// Reusable 3-card financial summary: Total Rate · Total Payments · Total Remaining.
// Used by both the Team tab and the Services tab so the structure is identical.
// Each tab passes its own scope-specific totals (team-only or service-only).
export default function FinancialSummaryCards({
  totalRate = 0,
  totalPayments = 0,
  totalRemaining = 0,
  currency = "INR"
}) {
  const cards = [
    { label: "Total Rate", value: formatMoney(totalRate, currency), tone: "default" },
    { label: "Total Payments", value: formatMoney(totalPayments, currency), tone: "default" },
    { label: "Total Remaining", value: formatMoney(Math.max(0, totalRemaining), currency), tone: "warning" }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{c.label}</div>
          <div className={cn(
            "text-lg font-bold mt-1 tabular-nums",
            c.tone === "warning" ? "text-warning" : "text-foreground"
          )}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}