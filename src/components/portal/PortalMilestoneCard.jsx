import { CheckCircle2, Clock, Circle } from "lucide-react";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// Shows actual milestone state based on real payment transactions.
// Only displayed when quotation is accepted — never fakes "Fully Paid".
export default function PortalMilestoneCard({ milestones, totalReceived, grandTotal, currency }) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Payment Milestones</h3>
      <div className="space-y-3">
        {milestones.map((m, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {m.paid ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                {m.due_date && (
                  <div className="text-xs text-muted-foreground">Due {formatDate(m.due_date)}</div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-foreground">{money(m.amount, currency)}</div>
              <div className={m.paid ? "text-xs text-success font-medium" : "text-xs text-muted-foreground"}>
                {m.paid ? "Paid" : "Pending"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}