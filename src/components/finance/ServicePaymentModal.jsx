import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import TransactionFields from "@/components/finance/TransactionFields";
import TransactionError from "@/components/finance/TransactionError";
import { todayStr } from "@/utils/team";
import { formatCurrency } from "@/utils/format";
import { computeServicePaymentSummary } from "@/utils/finance";

const empty = () => ({
  amount: "",
  transaction_date: todayStr(),
  payment_method: "Cash",
  reference_number: "",
  notes: "",
  error: {},
});

// Records a payment for a specific service assignment.
// Transaction type is determined by the provider:
//   provider_id === "client" → CLIENT_RECEIPT (money in)
//   provider_id is a team member → BUSINESS_EXPENSE (money out)
// The service_assignment_id links the payment to this service for history.
export default function ServicePaymentModal({
  open,
  onClose,
  event,
  assignment,
  transactions = [],
  onSubmit,
}) {
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(empty());
  }, [open]);

  const setField = (k, v) =>
    setForm((f) => ({ ...f, [k]: v, error: { ...f.error, [k]: undefined } }));

  const summary = assignment
    ? computeServicePaymentSummary(assignment, transactions)
    : null;
  const isClientProvider = assignment?.provider_id === "client";

  const handleSubmit = async () => {
    const err = {};
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0)
      err.amount = "Enter a valid amount";
    if (!form.transaction_date) err.transaction_date = "Select a date";
    if (Object.keys(err).length) {
      setForm((f) => ({ ...f, error: err }));
      return;
    }

    setSaving(true);
    try {
      const txnType = isClientProvider ? "CLIENT_RECEIPT" : "BUSINESS_EXPENSE";
      await onSubmit({
        transaction_type: txnType,
        event_id: assignment.event_id,
        service_assignment_id: assignment.id,
        client_id: isClientProvider ? event?.client_id : null,
        team_member_id: !isClientProvider ? assignment.provider_id : null,
        amount: amt,
        payment_method: form.payment_method,
        transaction_date: form.transaction_date,
        reference_number: form.reference_number.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (e) {
      setForm((f) => ({ ...f, error: { ...f.error, submit: e.message } }));
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Payment — ${assignment.service_name_snapshot || "Service"}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {form.error?.submit && <TransactionError message={form.error.submit} />}

        {/* Service context */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium text-foreground">
              {assignment.provider_name_snapshot || "—"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium text-foreground">
              {assignment.service_name_snapshot || "—"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium text-foreground">
              {formatCurrency(assignment.rate)}
            </span>
          </div>
          {summary && (
            <>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.totalPaid)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold text-warning">
                  {formatCurrency(summary.remaining)}
                </span>
              </div>
            </>
          )}
          <div className="mt-2 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">
              {isClientProvider
                ? "Payment direction: Received (money in from client)"
                : "Payment direction: Paid (money out to provider)"}
            </span>
          </div>
        </div>

        <TransactionFields form={form} setField={setField} />
      </div>
    </Modal>
  );
}