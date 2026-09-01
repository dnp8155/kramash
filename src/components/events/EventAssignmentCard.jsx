import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Format "YYYY-MM-DD" → "25 Jan 2026"
function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function EventAssignmentCard({
  assignment,
  member,
  event,
  currency,
  transactions,
  onAddPayment,
  onRemove,
  onShare,
  onRefresh,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  const paymentHistory = transactions.filter(
    (t) => t.team_assignment_id === assignment.id && t.status === "ACTIVE"
  );

  const paid = paymentHistory.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const rate = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, rate - paid);
  const isDue = remaining > 0;

  // Per-member booking dates stored on the assignment, else fall back to event dates
  const memberStart = assignment.booking_start_date || event?.start_date;
  const memberEnd = assignment.booking_end_date || event?.end_date || memberStart;
  const datesLabel = memberStart ? formatEventDate(memberStart, memberEnd) : "—";

  const handleDeletePayment = async (txId) => {
    if (!confirm("Delete this payment? This will reduce the paid amount.")) return;
    setDeletingId(txId);
    try {
      await base44.entities.FinancialTransaction.delete(txId);
      onRefresh?.();
      toast({ title: "Payment deleted" });
    } catch (e) {
      toast({ title: "Failed to delete payment", description: e?.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

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
          <div className="text-sm font-semibold text-foreground">{datesLabel}</div>
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

      {/* Payment history toggle */}
      <div className="border-t border-border pt-2 mt-2">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {paymentHistory.length > 0
            ? `Payment History (${paymentHistory.length})`
            : "No payments yet"}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-2">
            {paymentHistory.length === 0 && (
              <p className="text-xs text-muted-foreground">No payment records.</p>
            )}
            {paymentHistory.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">{fmtDate(t.transaction_date)}</div>
                  <div className="text-[11px] text-muted-foreground">{t.payment_method}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(t.amount, currency)}
                  </span>
                  <button
                    onClick={() => handleDeletePayment(t.id)}
                    disabled={deletingId === t.id}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-destructive text-white hover:opacity-80 transition-opacity disabled:opacity-50"
                    aria-label="Delete payment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}