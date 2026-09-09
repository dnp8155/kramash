import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import TransactionFields from "./TransactionFields";
import { todayStr } from "@/utils/team";

const empty = (event) => ({
  event_id: event?.id || "",
  expense_category_id: "",
  amount: "",
  transaction_date: todayStr(),
  payment_method: "Cash",
  reference_number: "",
  notes: "",
  error: {},
});

export default function RecordExpenseModal({
  open,
  onClose,
  event,
  events = [],
  categories = [],
  onSubmit,
}) {
  const [form, setForm] = useState(empty(event));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(empty(event));
  }, [open, event?.id]);

  const setField = (k, v) =>
    setForm((f) => ({ ...f, [k]: v, error: { ...f.error, [k]: undefined } }));

  const selectedEvent = event || events.find((e) => e.id === form.event_id);
  const activeCategories = categories.filter((c) => c.status !== "inactive");

  const handleSubmit = async () => {
    const err = {};
    if (!selectedEvent) err.event_id = "Select an event";
    if (!form.expense_category_id) err.expense_category_id = "Select a category";
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
        transaction_type: "BUSINESS_EXPENSE",
        event_id: selectedEvent.id,
        expense_category_id: form.expense_category_id,
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
      title="Record Expense"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Expense
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
        {event ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">{event.title}</p>
          </div>
        ) : (
          <Select
            label="Event"
            value={form.event_id}
            onChange={(e) => setField("event_id", e.target.value)}
            error={form.error?.event_id}
          >
            <option value="">Select an event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </Select>
        )}
        <Select
          label="Expense Category"
          value={form.expense_category_id}
          onChange={(e) => setField("expense_category_id", e.target.value)}
          error={form.error?.expense_category_id}
        >
          <option value="">Select a category…</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <TransactionFields form={form} setField={setField} />
      </div>
    </Modal>
  );
}