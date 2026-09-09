import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import TransactionFields from "./TransactionFields";
import { transactionTypeLabels } from "@/constants/finance";

const fromTxn = (t) => ({
  amount: t?.amount != null ? String(t.amount) : "",
  transaction_date: t?.transaction_date || "",
  payment_method: t?.payment_method || "Cash",
  reference_number: t?.reference_number || "",
  notes: t?.notes || "",
  error: {},
});

export default function EditTransactionModal({
  open,
  onClose,
  transaction,
  onSubmit,
}) {
  const [form, setForm] = useState(fromTxn(transaction));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(fromTxn(transaction));
  }, [open, transaction?.id]);

  const setField = (k, v) =>
    setForm((f) => ({ ...f, [k]: v, error: { ...f.error, [k]: undefined } }));

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
      await onSubmit({
        amount: amt,
        payment_method: form.payment_method,
        transaction_date: form.transaction_date,
        reference_number: form.reference_number.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setForm((f) => ({ ...f, error: { ...f.error, submit: err.message } }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Transaction"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {form.error?.submit && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {form.error.submit}
          </div>
        )}
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            {transactionTypeLabels[transaction?.transaction_type] || "Transaction"}
          </p>
        </div>
        <TransactionFields form={form} setField={setField} />
      </div>
    </Modal>
  );
}