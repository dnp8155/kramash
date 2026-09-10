import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp, Pencil, Crown, Briefcase } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { serviceAssignmentPaid } from "@/lib/financeService";
import { isSelfMember } from "@/lib/teamService";
import { cn } from "@/lib/utils";

// Full card for an Event Service Assignment — mirrors EventAssignmentCard (team)
// but for services. Shows provider, service, rate, payment status, and actions:
// Edit, Add Payment (hidden for SELF), Share, Delete, Payment History.
export default function ServiceAssignmentCard({
  assignment,
  service,
  event,
  currency,
  transactions,
  membersById = {},
  onAddPayment,
  onEdit,
  onRemove,
  onShare,
  onRefresh,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  // Resolve provider — could be a team member (SELF) or a custom name
  const providerMember = assignment.provider_id ? membersById[assignment.provider_id] : null;
  const isSelf = isSelfMember(providerMember);
  const providerName = assignment.provider_name_snapshot || providerMember?.name || "No provider";
  const serviceName = assignment.service_name_snapshot || service?.name || "Unknown service";

  // Payment history — transactions linked to THIS service assignment
  const paymentHistory = (transactions || []).filter(
    (t) => t.service_assignment_id === assignment.id && t.status === "ACTIVE"
  );

  const paid = serviceAssignmentPaid(transactions, assignment.id);
  const rate = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, rate - paid);
  const isDue = remaining > 0;
  const isPartiallyPaid = paid > 0 && paid < rate;
  const isPaid = paid >= rate && rate > 0;

  const statusLabel = isSelf ? "Owner Share" : isPaid ? "Paid" : isPartiallyPaid ? "Partially Paid" : "Pending";
  const statusClass = isSelf
    ? "bg-primary/10 text-primary"
    : isPaid
      ? "bg-success/10 text-success"
      : isPartiallyPaid
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";

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
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 min-w-0">
          <span className="truncate">{serviceName}</span>
          {assignment.is_addon && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-warning/15 text-warning">
              Add-on
            </span>
          )}
        </h4>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded shrink-0", statusClass)}>
          {statusLabel}
        </span>
      </div>

      {/* Provider line */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        {isSelf && <Crown className="w-3 h-3 text-primary shrink-0" />}
        <Briefcase className="w-3 h-3 shrink-0" />
        <span className="truncate">
          Provider: <span className="text-foreground font-medium">{providerName}</span>
          {isSelf && <span className="text-primary font-semibold"> — SELF</span>}
        </span>
      </div>

      {/* Financial details — hidden on mobile unless toggled */}
      <div className={cn(
        "grid grid-cols-2 gap-3 mb-3",
        showFinancials ? "flex flex-col gap-2" : "hidden sm:grid"
      )}>
        <div className="flex items-center justify-between sm:block">
          <div className="text-xs font-medium text-muted-foreground">Rate</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            assignment.is_addon ? "text-warning" : "text-foreground",
            showFinancials && "ml-auto"
          )}>{formatMoney(rate, currency)}</div>
        </div>
        <div className="flex items-center justify-between sm:block">
          <div className="text-xs font-medium text-muted-foreground">Total Payment</div>
          <div className={cn(
            "text-sm font-semibold text-success tabular-nums",
            showFinancials && "ml-auto"
          )}>{formatMoney(paid, currency)}</div>
        </div>
        <div className="flex items-center justify-between sm:block">
          <div className="text-xs font-medium text-muted-foreground">Remaining Payment</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            isDue ? "text-warning" : "text-foreground",
            showFinancials && "ml-auto"
          )}>{formatMoney(remaining, currency)}</div>
        </div>
        <div className="flex items-center justify-between sm:block">
          <div className="text-xs font-medium text-muted-foreground">Status</div>
          <div className={cn(
            "text-sm font-semibold",
            isSelf ? "text-primary" : isPaid ? "text-success" : isPartiallyPaid ? "text-warning" : "text-muted-foreground",
            showFinancials && "ml-auto"
          )}>{isSelf ? "Owner Share" : isPaid ? "Paid" : isPartiallyPaid ? "Partially Paid" : "Pending"}</div>
        </div>
      </div>

      {/* Mobile show/hide financials toggle */}
      <button
        onClick={() => setShowFinancials((s) => !s)}
        className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-primary hover:underline w-full mb-2"
      >
        {showFinancials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFinancials ? "Hide Details" : "Show Details"}
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