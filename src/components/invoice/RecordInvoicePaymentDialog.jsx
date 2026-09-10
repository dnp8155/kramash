import { useState, useEffect } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { recordInvoicePayment } from "@/lib/invoiceService";
import { formatMoney } from "@/utils/format";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { ensureDefaultFY, resolveFYForDate } from "@/lib/financialYearService";
import { X, AlertCircle } from "lucide-react";

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Other"];

const today = () => new Date().toISOString().slice(0, 10);

export default function RecordInvoicePaymentDialog({ open, onClose, invoice, onRecorded }) {
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = workspace?.currency || "INR";

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionDate, setTransactionDate] = useState(today());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setAmount("");
    setPaymentMethod("UPI");
    setTransactionDate(today());
    setReferenceNumber("");
    setNotes("");
    (async () => {
      try {
        const fiscalYears = await ensureDefaultFY(workspaceId);
        const fy = resolveFYForDate(today(), fiscalYears) || fiscalYears.find((item) => item.is_active);
        setFinancialYearId(fy?.id || "");
      } catch (e) { /* no FY */ }
    })();
  }, [open, workspaceId]);

  if (!open || !invoice) return null;

  const grandTotal = Number(invoice.grand_total) || 0;
  const currentPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = Math.max(0, grandTotal - currentPaid);

  const handleSave = async () => {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > balanceDue + 0.01) {
      setError(`Amount exceeds balance due (${formatMoney(balanceDue, currency)}).`);
      return;
    }
    if (!transactionDate) { setError("Payment date is required."); return; }
    if (!financialYearId) { setError("No active financial year found. Set one in Financial settings."); return; }
    setSaving(true);
    try {
      const res = await recordInvoicePayment(workspaceId, invoice.id, {
        amount: amt,
        payment_method: paymentMethod,
        transaction_date: transactionDate,
        reference_number: referenceNumber,
        notes,
        financial_year_id: financialYearId
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.message || data.error);
        setSaving(false);
        return;
      }
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem", "FinancialTransaction", "PaymentMilestone"]);
      toast({ title: "Payment recorded successfully" });
      onRecorded?.(data);
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to record payment.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Record Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium text-foreground">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground tabular-nums">{formatMoney(grandTotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Paid</span>
              <span className="font-medium text-foreground tabular-nums">{formatMoney(currentPaid, currency)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="font-semibold text-foreground">Balance Due</span>
              <span className="font-bold text-foreground tabular-nums">{formatMoney(balanceDue, currency)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount Received *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(balanceDue)}
              max={balanceDue}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Date *</label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reference Number (optional)</label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="UTR / Cheque no / Transaction ID"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="success" onClick={handleSave} disabled={saving}>
            {saving ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}