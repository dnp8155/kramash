import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp, Pencil, Crown } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import MemberTypeTag from "@/components/common/MemberTypeTag";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import { voidTransaction } from "@/lib/financeService";
import { paymentDotInfo } from "@/components/common/PaymentDot";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";

export default function EventAssignmentCard({
  assignment,
  member,
  event,
  currency,
  contractValue,
  transactions,
  isSelf = false,
  onAddPayment,
  onRemove,
  onShare,
  onRefresh,
  onEdit,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const paymentHistory = transactions.filter(
    (t) => t.team_assignment_id === assignment.id && t.status === "ACTIVE"
  );

  const paid = paymentHistory.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const rate = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, rate - paid);

  // Accent bar matches the payment status dot color next to the member name
  const dotInfo = paymentDotInfo(paid, rate);
  const isDue = remaining > 0;

  // Self/Owner dot: based on CLIENT's payment settlement, not the owner's own rate.
  // Owner's internal rate is NOT treated as money paid to an employee.
  const clientPaid = (transactions || [])
    .filter((t) => t.transaction_type === "CLIENT_RECEIPT" && t.status === "ACTIVE" && t.event_id === event?.id)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const clientTotal = contractValue != null ? contractValue : (Number(event?.contract_value) || 0);
  const clientFullyPaid = clientTotal > 0 && clientPaid >= clientTotal;

  // Per-member booking dates stored on the assignment, else fall back to event dates
  const memberStart = assignment.booking_start_date || event?.start_date;
  const memberEnd = assignment.booking_end_date || event?.end_date || memberStart;
  const datesLabel = memberStart ? formatEventDate(memberStart, memberEnd) : "—";

  const handleDeletePayment = async (txId) => {
    if (!confirm("Void this payment? It will be marked void and the paid amount recalculated.")) return;
    setDeletingId(txId);
    try {
      const res = await voidTransaction(event?.workspace_id, txId);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: "Failed to void payment", description: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      onRefresh?.();
      toast({ title: "Payment voided" });
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message;
      toast({ title: "Failed to void payment", description: msg, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pl-1">
        <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
          <span className="truncate">{member?.name || "Unknown member"}</span>
          {isSelf && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shrink-0">
              <Crown className="w-2.5 h-2.5" /> Self
            </span>
          )}
        </h4>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {assignment.role_name_snapshot || member?.profession || "—"}
        </span>
        {(assignment.member_type_snapshot || assignment.member_type_id) && (
          <MemberTypeTag label={assignment.member_type_snapshot} typeId={assignment.member_type_id} />
        )}
      </div>

      {/* Dates — always visible (compact on mobile) */}
      <div className="text-xs text-muted-foreground mb-3 sm:hidden">
        <span className="font-medium text-foreground">{datesLabel}</span>
      </div>

      {/* Details grid — always visible */}
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

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <button
          onClick={() => onEdit?.(assignment)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-foreground text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        {!isSelf && (
          <button
            onClick={() => onAddPayment?.(assignment)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success text-success-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </button>
        )}
        <button
          onClick={() => onShare?.(assignment)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-foreground/30 text-foreground hover:bg-muted transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove?.(assignment)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
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
                    onClick={() => setEditingTx(t)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    aria-label="Edit payment"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
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

      {editingTx && (
        <EditTransactionDialog
          open={!!editingTx}
          transaction={editingTx}
          currency={currency}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}