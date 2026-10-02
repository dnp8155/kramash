import { useState } from "react";
import { Plus, Share2, Trash2, ChevronDown, ChevronUp, Pencil, Crown, Briefcase } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { formatEventDate, isEventFinished } from "@/lib/dates";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { serviceAssignmentPaid, voidTransaction } from "@/lib/financeService";
import { isSelfMember } from "@/lib/teamService";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { paymentDotInfo } from "@/components/common/PaymentDot";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

export default function ServiceAssignmentCard({
  assignment,
  service,
  event,
  currency,
  contractValue,
  transactions,
  membersById = {},
  onAddPayment,
  onEdit,
  onRemove,
  onShare,
  onRefresh,
}) {
  const t = useT();
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const providerMember = assignment.provider_id ? membersById[assignment.provider_id] : null;
  const isSelf = isSelfMember(providerMember);
  const providerName = assignment.provider_name_snapshot || providerMember?.name || t("No provider");
  const serviceName = assignment.service_name_snapshot || service?.name || t("Unknown service");

  const paymentHistory = (transactions || []).filter(
    (tx) => tx.service_assignment_id === assignment.id && tx.status === "ACTIVE"
  );

  const paid = serviceAssignmentPaid(transactions, assignment.id);
  const rate = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, rate - paid);
  const isDue = remaining > 0;
  const isPartiallyPaid = paid > 0 && paid < rate;
  const isPaid = paid >= rate && rate > 0;

  const dotInfo = paymentDotInfo(paid, rate);

  const clientPaid = (transactions || [])
    .filter((tx) => tx.transaction_type === "CLIENT_RECEIPT" && tx.status === "ACTIVE" && tx.event_id === event?.id)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const clientTotal = contractValue != null ? contractValue : (Number(event?.contract_value) || 0);
  const clientFullyPaid = clientTotal > 0 && clientPaid >= clientTotal;
  const finished = isEventFinished(event);

  const handleDeletePayment = async (txId) => {
    if (!confirm(t("Void this payment? It will be marked void and the paid amount recalculated."))) return;
    setDeletingId(txId);
    try {
      const res = await voidTransaction(event?.workspace_id, txId);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: t("Failed to void payment"), description: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      onRefresh?.();
      toast({ title: t("Payment voided") });
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message;
      toast({ title: t("Failed to void payment"), description: msg, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 min-w-0">
          <span
            className={cn("w-2 h-2 rounded-full shrink-0 status-dot", dotInfo.className)}
            title={t(dotInfo.label)}
          />
          <span className="truncate">{serviceName}</span>
          {assignment.is_addon && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
              {t("Add-on")}
            </span>
          )}
        </h4>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        {isSelf && <Crown className="w-3 h-3 text-primary shrink-0" />}
        <Briefcase className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {t("Provider:")} <span className="text-foreground font-medium">{providerName}</span>
          {isSelf && <span className="text-primary font-semibold"> — {t("SELF")}</span>}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{t("Rate")}</div>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              assignment.is_addon ? "text-warning" : "text-foreground"
            )}>{formatMoney(rate, currency)}</span>
            {assignment.rate_type && (
              <span className="text-[11px] text-muted-foreground">{assignment.rate_type}</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{t("Total Payment")}</div>
          <div className="text-sm font-semibold text-success tabular-nums">{formatMoney(paid, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{t("Remaining Payment")}</div>
          <div className={cn(
            "text-sm font-semibold tabular-nums",
            isDue ? "text-warning" : "text-foreground"
          )}>{formatMoney(remaining, currency)}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{t("Status")}</div>
          <div className={cn(
            "text-sm font-semibold",
            isSelf ? "text-primary" : isPaid ? "text-success" : isPartiallyPaid ? "text-warning" : "text-muted-foreground"
          )}>{isSelf ? t("Owner Share") : isPaid ? t("Paid") : isPartiallyPaid ? t("Partially Paid") : t("Pending")}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <button
          onClick={() => onEdit?.(assignment)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> {t("Edit")}
        </button>
        {!isSelf && (
          <button
            onClick={() => onAddPayment?.(assignment)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success text-success-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> {t("Add Payment")}
          </button>
        )}
        <button
          onClick={() => !finished && onShare?.(assignment)}
          disabled={finished}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
            finished
              ? "bg-muted border-border text-muted-foreground/50 cursor-not-allowed"
              : "bg-card border-border text-foreground hover:bg-muted"
          )}
          aria-label={t("Share")}
          title={finished ? t("Event has ended") : t("Share")}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove?.(assignment)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          aria-label={t("Remove")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isSelf && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 mt-2">
          <p className="text-xs text-primary font-medium">
            {t("Owner share — no external payment is recorded for the workspace owner.")}
          </p>
        </div>
      )}

      {!isSelf && (
        <div className="border-t border-border pt-2 mt-2">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {paymentHistory.length > 0
              ? `${t("Payment History")} (${paymentHistory.length})`
              : t("No payments yet")}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {paymentHistory.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("No payment records.")}</p>
              )}
              {paymentHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">{formatEventDate(tx.transaction_date)}</div>
                    <div className="text-[11px] text-muted-foreground">{tx.payment_method || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(tx.amount, currency)}
                    </span>
                    <button
                      onClick={() => handleDeletePayment(tx.id)}
                      disabled={deletingId === tx.id}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                      aria-label={t("Delete payment")}
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