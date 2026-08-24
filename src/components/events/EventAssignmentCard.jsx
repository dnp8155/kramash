import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  const status = isDue ? "Due" : "Paid";

  const paymentHistory = transactions.filter(
    (t) => t.team_assignment_id === assignment.id && t.status === "ACTIVE"
  );

  return (
    <Card className="p-4 border-2 border-border rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">UNASSIGNED</div>
        <span className={cn(
          "w-2.5 h-2.5 rounded-full",
          isDue ? "bg-destructive" : "bg-success"
        )} />
      </div>

      {/* Member name */}
      <div className="mb-3">
        <h4 className="text-base font-bold text-foreground">
          {member?.name || "Unknown member"}
          <span className="text-muted-foreground font-normal text-sm ml-1.5">
            ({assignment.role_name_snapshot || member?.profession || "—"})
          </span>
        </h4>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Rate</div>
          <div className="text-sm font-semibold text-foreground">{formatMoney(rate, currency)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Dates</div>
          <div className="text-sm font-semibold text-foreground">
            {event ? formatEventDate(event.start_date, event.end_date) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Total Payment</div>
          <div className="text-sm font-semibold text-foreground">{formatMoney(paid, currency)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Remaining</div>
          <div className="text-sm font-semibold text-warning">{formatMoney(remaining, currency)}</div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Status:</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
          isDue ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
        )}>
          {status}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onAddPayment?.(assignment)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Payment
        </button>
        <button
          onClick={() => onShare?.(assignment)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove?.(assignment)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Payment history */}
      {paymentHistory.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Show Payment History
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {paymentHistory.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.transaction_date}</span>
                  <span className="font-semibold text-foreground">{formatMoney(t.amount, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}