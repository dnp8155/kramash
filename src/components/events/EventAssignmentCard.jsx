import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function EventAssignmentCard({
  assignment,
  member,
  event,
  currency,
  transactions,
  onAddPayment,
  onRemove,
  onShare,
}) {
  const [showHistory, setShowHistory] = useState(false);

  const paid = transactions
    .filter((t) => t.team_assignment_id === assignment.id && t.status === "ACTIVE")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const rate = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, rate - paid);
  const isDue = remaining > 0;

  const paymentHistory = transactions.filter(
    (t) => t.team_assignment_id === assignment.id && t.status === "ACTIVE"
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground truncate">
          {member?.name || "Unknown member"}
        </h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded",
          isDue ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
        )}>
          {isDue ? "Due" : "Paid"}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        {assignment.role_name_snapshot || member?.profession || "—"}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Rate</div>
          <div className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(rate, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Dates</div>
          <div className="text-sm font-semibold text-foreground">
            {event ? formatEventDate(event.start_date, event.end_date) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Paid</div>
          <div className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(paid, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Remaining</div>
          <div className="text-sm font-semibold text-warning tabular-nums">{formatMoney(remaining, currency)}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => onAddPayment?.(assignment)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Payment
        </button>
        <button
          onClick={() => onShare?.(assignment)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove?.(assignment)}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Payment history */}
      {paymentHistory.length > 0 && (
        <div className="border-t border-border pt-3 mt-2">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Payment History ({paymentHistory.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {paymentHistory.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.transaction_date}</span>
                  <span className="font-semibold text-foreground tabular-nums">{formatMoney(t.amount, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}