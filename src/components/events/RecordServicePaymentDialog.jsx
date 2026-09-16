import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import DialogContextCard from "@/components/common/DialogContextCard";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { formatMoney } from "@/utils/format";
import { todayISO } from "@/lib/dates";
import { serviceAssignmentPaid } from "@/lib/financeService";
import { isSelfMember } from "@/lib/teamService";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";

// Record a payment for a specific Service Assignment.
// Routed through the backend recordPayment function (kind="service") which
// enforces the SELF guard and links the transaction via service_assignment_id.
export default function RecordServicePaymentDialog({
  open, onClose, onSaved,
  assignment, event, workspaceId, currency = "INR",
  transactions = [], membersById = {}
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const { fiscalYears } = useFinancialYear();
  const queryClient = useQueryClient();

  const providerMember = assignment?.provider_id ? membersById[assignment.provider_id] : null;
  const isSelf = isSelfMember(providerMember);

  useEffect(() => {
    if (open) {
      setError("");
      setAmount("");
      setDate(todayISO());
      setMethod("Cash");
      setReference("");
      setNotes("");
    }
  }, [open]);

  if (!assignment) return null;

  const rate = Number(assignment.agreed_rate) || 0;
  const paid = serviceAssignmentPaid(transactions, assignment.id);
  const remaining = Math.max(0, rate - paid);

  const validate = () => {
    if (isSelf) return "The workspace owner cannot be paid as a service provider.";
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return "Amount must be greater than zero.";
    if (!date) return "Please select a payment date.";
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
      const providerName = assignment.provider_name_snapshot || "";
      const _res = await base44.functions.invoke("recordPayment", {
        kind: "service",
        workspace_id: workspaceId,
        event_id: event.id,
        service_assignment_id: assignment.id,
        amount: Number(amount),
        payment_method: method,
        transaction_date: date,
        reference_number: reference.trim(),
        notes: notes.trim() || `Service payment: ${assignment.service_name_snapshot || ""}${providerName ? ` (${providerName})` : ""}`,
        financial_year_id: fy.id
      });
      const saved = _res?.data || _res;
      invalidateEntity(queryClient, "FinancialTransaction");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.data || err;
      if (data?.error === "SELF_PAYMENT_BLOCKED") {
        setError(data.message || "The workspace owner cannot be paid as a service provider.");
      } else {
        setError(data?.error || data?.message || "Failed to record payment. Please try again.");
      }
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>Record Service Payment</AppDialogTitle>
          <AppDialogDescription>
            {assignment.service_name_snapshot || "Service"}
            {assignment.provider_name_snapshot ? ` · ${assignment.provider_name_snapshot}` : ""}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <DialogContextCard event={event} />
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Rate</div>
              <div className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(rate, currency)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Paid</div>
              <div className="text-sm font-semibold text-success tabular-nums">{formatMoney(paid, currency)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Remaining</div>
              <div className="text-sm font-semibold text-warning tabular-nums">{formatMoney(remaining, currency)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ({currency}) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
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
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          {date && (() => {
            const fy = resolveFYForDate(date, fiscalYears);
            return fy ? (
              <p className="text-xs text-muted-foreground">
                Will be recorded under <span className="font-medium text-foreground">{fy.fy_id}</span> ({fy.label})
              </p>
            ) : (
              <p className="text-xs text-destructive">
                No Financial Year covers this date. Create the applicable FY first.
              </p>
            );
          })()}

          {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}