import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { todayISO } from "@/lib/dates";

// Record a business / event expense. Event is required (Beta is event-level).
export default function RecordExpenseDialog({
  open, onClose, onSaved,
  workspaceId, currency = "INR",
  events = [],
  categories = [],
  preselectedEventId = ""
}) {
  const [eventId, setEventId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { fiscalYears } = useFinancialYear();

  useEffect(() => {
    if (open) {
      setError("");
      setEventId(preselectedEventId || "");
      setCategoryId("");
      setAmount("");
      setDate(todayISO());
      setMethod("Cash");
      setReference("");
      setNotes("");
    }
  }, [open, preselectedEventId]);

  const validate = () => {
    if (!eventId) return "Please select an event.";
    if (!categoryId) return "Please select an expense category.";
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return "Amount must be greater than zero.";
    if (!date) return "Please select an expense date.";
    if (!method) return "Please select a payment method.";
    const fy = resolveFYForDate(date, fiscalYears);
    if (!fy) return "No Financial Year is available for this transaction date. Please create the applicable Financial Year first.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      // Verify the event belongs to the workspace.
      const ev = events.find((x) => x.id === eventId);
      if (!ev || ev.workspace_id !== workspaceId) {
        setError("Selected event is not available in this workspace.");
        setSaving(false);
        return;
      }
      const cat = categories.find((c) => c.id === categoryId);
      const fy = resolveFYForDate(date, fiscalYears);
      if (!fy) {
        setError("No Financial Year is available for this transaction date. Please create the applicable Financial Year first.");
        setSaving(false);
        return;
      }
      const payload = {
        workspace_id: workspaceId,
        financial_year_id: fy.id,
        event_id: eventId,
        transaction_type: "BUSINESS_EXPENSE",
        expense_category_id: categoryId,
        expense_category_name_snapshot: cat?.name || "",
        amount: Number(amount),
        payment_method: method,
        transaction_date: date,
        reference_number: reference.trim(),
        notes: notes.trim(),
        status: "ACTIVE"
      };
      const saved = await base44.entities.FinancialTransaction.create(payload);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to record expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>Record a business or event expense.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Event <span className="text-destructive">*</span></Label>
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full">
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Expense Category <span className="text-destructive">*</span></Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full">
              <option value="">Select a category</option>
              {categories.filter((c) => c.status === "active").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
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
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}