import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { CalendarClock } from "lucide-react";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function dateShort(d) {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function QuotationMilestones({ milestones, grandTotal, currency }) {
  if (!milestones || milestones.length === 0) return null;

  const rows = milestones.map((m) => {
    const amount = m.type === "percent"
      ? Math.round((Number(m.value || 0) / 100) * (grandTotal || 0) * 100) / 100
      : Math.round(Number(m.value || 0) * 100) / 100;
    return { name: m.name || "Payment", amount, due_date: m.due_date || "" };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Payment Milestones</h2>
      <div className="space-y-2">
        {rows.map((m, i) => (
          <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {m.amount > 0 && grandTotal > 0 ? Math.round((m.amount / grandTotal) * 100) : ""}%
              </span>
              <div className="min-w-0">
                <span className="text-sm text-foreground block truncate">{m.name}</span>
                {m.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarClock className="w-3 h-3" /> {dateShort(m.due_date)}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">{money(m.amount, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}