import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp, Pencil, Crown } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function EventAssignmentCard({
  assignment,
  member,
  event,
  currency,
  transactions,
  isSelf = false,
  onAddPayment,
  onRemove,
  onShare,
  onRefresh,
  onEdit,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
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
        <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
          <span className="truncate">{member?.name || "Unknown member"}</span>
          {isSelf && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shrink-0">
              <Crown className="w-2.5 h-2.5" /> Self
            </span>
          )}
        </h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded",
          isSelf ? "bg-primary/10 text-primary" : isDue ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
        )}>
          {isSelf ? "Owner Share" : isDue ? "Due" : "Paid"}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {assignment.role_name_snapshot || member?.profession || "—"}
        </span>
        {assignment.member_type_snapshot && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
            assignment.member_type_snapshot?.toLowerCase().includes("bride")
              ? "bg-pink-100 text-pink-700"
              : assignment.member_type_snapshot?.toLowerCase().includes("groom")
                ? "bg-blue-100 text-blue-700"
                : "bg-muted text-muted-foreground"
          )}>
            {assignment.member_type_snapshot}
          </span>
        )}
      </div>

      {/* Dates — always visible (compact on mobile) */}
      <div className="text-xs text-muted-foreground mb-3 sm:hidden">
        <span className="font-medium text-foreground">{datesLabel}</span>
      </div>

      {/* Details grid — hidden on mobile unless toggled */}
      <div className={cn(
        "grid grid-cols-2 gap-3 mb-3",
        showFinancials ? "flex" : "hidden sm:grid"
      )}>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Rate</div>
          <div className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(rate, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Dates</div>
          <div className="text-sm font-semibold text-foreground">{datesLabel}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{isSelf ? "Paid" : "Paid"}</div>
          <div className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(paid, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{isSelf ? "Owner Share" : "Remaining"}</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            isSelf ? "text-primary" : "text-warning"
          )}>{formatMoney(remaining, currency)}</div>
        </div>
      </div>

      {/* Mobile show/hide financials toggle */}
      <button
        onClick={() => setShowFinancials((s) => !s)}
        className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-full mb-2"
      >
        {showFinancials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFinancials ? "Hide Financials" : "Show Financials"}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <button
          onClick={() => onEdit?.(assignment)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
        {!isSelf && (
          <button
            onClick={() => onAddPayment?.(assignment)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Payment
          </button>
        )}
        <button
          onClick={() => onShare?.(assignment)}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove?.(assignment)}
          className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Self note — owner share, no external payment */}
      {isSelf && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 mt-2">
          <p className="text-xs text-primary font-medium">
            Owner share — no external payment is recorded for the workspace owner.
          </p>
        </div>
      )}

      {/* Payment history toggle — hidden for Self (no payments can exist) */}
      {!isSelf && (
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
                  <div className="text-xs font-semibold text-foreground">{formatEventDate(t.transaction_date)}</div>
                  <div className="text-[11px] text-muted-foreground">{t.payment_method || "—"}</div>
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
      )}
    </div>
  );
}