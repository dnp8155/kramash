import { CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatDate } from "@/lib/dates";

// Payment Milestones card shared by the client project portal and the public quotation page, so both look
// like the same app. Each milestone: { name, amount, pct?, due_condition?, timing?, due_date?, paid?, paid_amount? }.
// showStatus=false lists the schedule only (quotation not accepted yet): no Paid / Pending, no totals.
export default function PortalMilestoneCard({ milestones, totalReceived, grandTotal, currency, showStatus = true }) {
  if (!milestones || milestones.length === 0) return null;
  const money = (n) => formatMoney(n, currency);
  const pctText = (p) => (p > 0 ? `${Number.isInteger(p) ? p : Math.round(p * 100) / 100}%` : "");
  const received = Math.min(Number(totalReceived) || 0, Number(grandTotal) || Infinity);
  const balance = Math.max(0, (Number(grandTotal) || 0) - (Number(totalReceived) || 0));

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Payment Milestones</h3>
      <div className="space-y-3">
        {milestones.map((m, idx) => {
          const paidAmount = Number(m.paid_amount) || 0;
          const partial = showStatus && !m.paid && paidAmount > 0;
          // The quotation's own wording first (e.g. "On signing"), then its date.
          const when = [...new Set([m.timing || String(m.due_condition || "").trim(), m.due_date ? formatDate(m.due_date) : ""].filter(Boolean))].join(" · ");
          const sub = [pctText(Number(m.pct) || 0), when].filter(Boolean).join(" · ");
          return (
            <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {showStatus ? (
                  m.paid ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    : <Clock className={`w-4 h-4 shrink-0 ${partial ? "text-warning" : "text-muted-foreground"}`} />
                ) : (
                  <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.name || "Payment"}</div>
                  {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-foreground">{money(m.amount)}</div>
                {showStatus && (
                  m.paid ? <div className="text-xs text-success font-medium">Paid</div>
                    : partial ? (
                      <div className="text-xs text-warning font-medium">
                        Partially paid · {money(paidAmount)} of {money(m.amount)} · {money(Math.max(0, (Number(m.amount) || 0) - paidAmount))} due
                      </div>
                    ) : <div className="text-xs text-muted-foreground">Pending</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showStatus && Number(grandTotal) > 0 && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Received so far</div>
            <div className="font-semibold text-success tabular-nums">{money(received)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Balance due</div>
            <div className="font-semibold text-foreground tabular-nums">{money(balance)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
