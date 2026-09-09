import { useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Share2,
  Loader2,
} from "lucide-react";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/utils/format";
import { computeServicePaymentSummary } from "@/utils/finance";
import { transactionTypeLabels } from "@/constants/finance";
import SelfBadge from "@/components/common/SelfBadge";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isSelfProvider } from "@/utils/selfDetection";

// Full card for a single service assignment: shows provider, service, rate,
// payment summary (total/remaining/status), actions (edit/add payment/remove),
// and a collapsible payment history with per-payment edit/share/delete.
export default function ServiceAssignmentCard({
  assignment,
  event,
  client,
  members,
  transactions = [],
  onEdit,
  onAddPayment,
  onRemove,
  onEditPayment,
  onDeletePayment,
  onShareInvoice,
  removingId = null,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  const summary = computeServicePaymentSummary(assignment, transactions);
  const isClientProvider = assignment.provider_id === "client";
  const { ownerName } = useWorkspace();
  const isSelf = isSelfProvider(assignment, members, ownerName);

  const handleRemoveClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onRemove(assignment.id);
    setConfirmDelete(false);
  };

  const handleDeletePayment = (paymentId) => {
    if (deletingPaymentId === paymentId) {
      onDeletePayment(paymentId);
      setDeletingPaymentId(null);
    } else {
      setDeletingPaymentId(paymentId);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 ${
        assignment.is_addon
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-card"
      }`}
    >
      {/* Header: Provider + Service + Add-on badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {assignment.service_name_snapshot || "Service"}
            </p>
            {assignment.is_addon && (
              <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                ADD-ON
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Provider: {assignment.provider_name_snapshot || "—"}
            {isSelf && <SelfBadge className="ml-1.5" />}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Rate</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(assignment.rate)}
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {isClientProvider ? "Received" : "Paid"}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p
            className={`text-sm font-semibold ${
              summary.remaining > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {formatCurrency(summary.remaining)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={summary.status} className="mt-0.5" />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(assignment)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        {!isSelf && (
          <Button size="sm" variant="outline" onClick={() => onAddPayment(assignment)}>
            <Plus className="h-3.5 w-3.5" /> Add Payment
          </Button>
        )}
        {isSelf && (
          <span className="text-xs text-muted-foreground">
            Owner share — no payment required
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemoveClick}
          disabled={removingId === assignment.id}
          className="text-muted-foreground hover:text-destructive"
        >
          {removingId === assignment.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : confirmDelete ? (
            <>
              <Trash2 className="h-3.5 w-3.5" /> Confirm?
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </>
          )}
        </Button>
      </div>

      {/* Payment History toggle */}
      {summary.payments.length > 0 && (
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span>
            {showHistory ? "Hide Payment History" : "Show Payment History"}
            {" "}
            ({summary.payments.length})
          </span>
          {showHistory ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Payment History list */}
      {showHistory && summary.payments.length > 0 && (
        <div className="mt-2 space-y-2">
          {summary.payments.map((p) => {
            const pMember = members.find((m) => m.id === p.team_member_id);
            const isVoided = p.status === "VOID";
            return (
              <div
                key={p.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 ${
                  isVoided ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {formatDate(p.transaction_date)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      · {p.payment_method}
                    </span>
                    {isVoided && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        VOID
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {transactionTypeLabels[p.transaction_type] || "—"}
                    {p.reference_number ? ` · Ref: ${p.reference_number}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isVoided
                      ? "text-muted-foreground line-through"
                      : p.transaction_type === "CLIENT_RECEIPT"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {p.transaction_type === "CLIENT_RECEIPT" ? "+" : "−"}
                  {formatCurrency(p.amount)}
                </span>
                {!isVoided && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditPayment(p)}
                      title="Edit"
                      className="h-7 w-7"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onShareInvoice(p)}
                      title="Share Invoice"
                      className="h-7 w-7"
                    >
                      <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePayment(p.id)}
                      title={deletingPaymentId === p.id ? "Click again to confirm" : "Delete"}
                      className="h-7 w-7"
                    >
                      <Trash2
                        className={`h-3.5 w-3.5 ${
                          deletingPaymentId === p.id
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}