import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import TransactionFields from "./TransactionFields";
import TransactionError from "./TransactionError";
import { todayStr } from "@/utils/team";

const empty = (event) => ({
  event_id: event?.id || "",
  amount: "",
  transaction_date: todayStr(),
  payment_method: "UPI",
  reference_number: "",
  notes: "",
  error: {},
});

export default function RecordClientPaymentModal({
  open,
  onClose,
  event,
  events = [],
  clients = [],
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
  const client = clients.find((c) => c.id === selectedEvent?.client_id);

  const handleSubmit = async () => {
    const err = {};
    if (!selectedEvent) err.event_id = "Select an event";
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
        transaction_type: "CLIENT_RECEIPT",
        event_id: selectedEvent.id,
        client_id: selectedEvent.client_id,
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
      title="Record Client Payment"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {form.error?.submit && <TransactionError message={form.error.submit} />}
        {event ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">{event.title}</p>
            <p className="text-muted-foreground">Client: {client?.name || "—"}</p>
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
        {selectedEvent && !event && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Client: {client?.name || "—"}
          </p>
        )}
        <TransactionFields form={form} setField={setField} />
      </div>
    </Modal>
  );
}