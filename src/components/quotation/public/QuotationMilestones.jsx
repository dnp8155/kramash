import { formatMoney } from "@/utils/format";
import { formatDate } from "@/lib/dates";
import { CalendarClock } from "lucide-react";
import { calculateMilestones } from "@/lib/quotationCalc";

function money(n, currency) {
  return formatMoney(n, currency);
}

function dateShort(d) {
  if (!d) return "";
  return formatDate(d);
}

export default function QuotationMilestones({ milestones, grandTotal, currency }) {
  if (!milestones || milestones.length === 0) return null;

  const TIMING = { on_signing: "On signing", event_day: "On event day", day_after_event: "Day after event" };
  const rows = calculateMilestones(milestones, grandTotal).map((m) => ({
    name: m.name || "Payment",
    amount: m.calculated_amount,
    // The quotation's own wording first (e.g. "Within 2 days of signing"), then its date.
    timing: [...new Set([String(m.due_condition || "").trim() || TIMING[m.due_date_type] || "", m.due_date ? dateShort(m.due_date) : ""].filter(Boolean))].join(" · "),
    pct: m.type === "percent" ? Number(m.value) || 0 : (grandTotal > 0 ? (m.calculated_amount / grandTotal) * 100 : 0),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Payment Milestones</h2>
      <div className="space-y-2">
        {rows.map((m, i) => (
          <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {m.pct > 0 ? `${Number.isInteger(m.pct) ? m.pct : Math.round(m.pct * 100) / 100}%` : ""}
              </span>
              <div className="min-w-0">
                <span className="text-sm text-foreground block truncate">{m.name}</span>
                {m.timing && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarClock className="w-3 h-3" /> {m.timing}
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