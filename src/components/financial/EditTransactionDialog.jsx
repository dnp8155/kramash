import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LIST, TRANSACTION_TYPES } from "@/constants/financeConfig";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRelated, upsertOptimistic } from "@/lib/queryInvalidation";
import { editTransaction } from "@/lib/financeService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";

export default function EditTransactionDialog({
  open, onClose, onSaved,
  transaction, currency = "INR"
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const { fiscalYears } = useFinancialYear();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (open && transaction) {
      setError("");
      setAmount(transaction.amount != null ? String(transaction.amount) : "");
      setDate(transaction.transaction_date || "");
      setMethod(transaction.payment_method || "Cash");
      setReference(transaction.reference_number || "");
      setNotes(transaction.notes || "");
    }
  }, [open, transaction]);

  if (!transaction) return null;

  const typeLabel = TRANSACTION_TYPES[transaction.transaction_type]?.label || transaction.transaction_type;

  const validate = () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return "Amount must be greater than zero.";
    if (!date) return "Please select a date.";
    if (!method) return "Please select a payment method.";
    const fy = resolveFYForDate(date, fiscalYears);
    if (!fy) return "No Financial Year is available for this transaction date. Please create the applicable Financial Year first.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!assertOnline()) return;
    if (!start()) return;
    setError("");
    try {
      const fy = resolveFYForDate(date, fiscalYears);
      if (!fy) {
        setError("No Financial Year is available for this transaction date. Please create the applicable Financial Year first.");
        return;
      }
      const res = await editTransaction(workspaceId, transaction.id, {
        amount: Number(amount),
        transaction_date: date,
        payment_method: method,
        reference_number: reference.trim(),
        notes: notes.trim(),
        financial_year_id: fy.id
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.message || data.error);
        return;
      }
      upsertOptimistic(queryClient, ["financial", workspaceId], data,
        (d) => d?.allTx, (d, list) => ({ ...d, allTx: list }));
      invalidateRelated(queryClient, "FinancialTransaction");
      invalidateRelated(queryClient, "Invoice");
      invalidateRelated(queryClient, "PaymentMilestone");
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to update transaction. Please try again.");
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>Edit Transaction</AppDialogTitle>
          <AppDialogDescription>
            {typeLabel} · {transaction.transaction_date}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ({currency}) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Method <span className="text-destructive">*</span></Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full">
                {PAYMENT_METHOD_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference No.</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}