import { useState } from "react";
import { base44 } from "@/api/base44Client";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

export default function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const [amount, setAmount] = useState(invoice?.balance_due || 0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!amount || amount <= 0) { setError("Enter a valid amount"); return; }
    if (amount > (invoice?.balance_due || 0)) { setError(`Amount exceeds balance due (${formatCurrency(invoice.balance_due)})`); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("recordInvoicePayment", {
        invoice_id: invoice.id,
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
      });
      if (res.status >= 200 && res.status < 300) {
        toast({ title: "Payment recorded successfully" });
        onSuccess?.(res.data);
        onClose?.();
      } else {
        setError(res.data?.error || "Failed to record payment");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-semibold">{formatCurrency(invoice?.total_amount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Already Paid</span>
            <span className="font-medium text-emerald-600">{formatCurrency(invoice?.amount_paid || 0)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="font-medium text-foreground">Balance Due</span>
            <span className="font-bold text-foreground">{formatCurrency(invoice?.balance_due || 0)}</span>
          </div>
        </div>

        <Input
          label="Amount Received *"
          type="number"
          min="1"
          max={invoice?.balance_due || undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Payment Date *"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
          <option value="Card">Card</option>
          <option value="Other">Other</option>
        </Select>
        <Input
          label="Transaction Reference (UTR / Cheque No)"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}