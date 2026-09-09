import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import TransactionFields from "./TransactionFields";
import TransactionError from "./TransactionError";
import { todayStr } from "@/utils/team";
import { formatCurrency } from "@/utils/format";

const empty = (assignmentId) => ({
  team_assignment_id: assignmentId || "",
  amount: "",
  transaction_date: todayStr(),
  payment_method: "Cash",
  reference_number: "",
  notes: "",
  error: {},
});

export default function RecordTeamPaymentModal({
  open,
  onClose,
  event,
  events = [],
  assignments = [],
  members = [],
  preselectedAssignmentId,
  onSubmit,
}) {
  const [form, setForm] = useState(empty(preselectedAssignmentId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(empty(preselectedAssignmentId));
  }, [open, preselectedAssignmentId]);

  const setField = (k, v) =>
    setForm((f) => ({ ...f, [k]: v, error: { ...f.error, [k]: undefined } }));

  const eventAssignments = assignments.filter(
    (a) =>
      a.assignment_status === "Assigned" &&
      (event ? a.event_id === event.id : true)
  );
  const selectedAssignment = eventAssignments.find(
    (a) => a.id === form.team_assignment_id
  );
  const member = members.find((m) => m.id === selectedAssignment?.team_member_id);

  const handleSubmit = async () => {
    const err = {};
    if (!selectedAssignment) err.team_assignment_id = "Select a team member";
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
        transaction_type: "TEAM_PAYMENT",
        event_id: selectedAssignment.event_id,
        team_member_id: selectedAssignment.team_member_id,
        team_assignment_id: selectedAssignment.id,
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
      title="Record Team Payment"
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
        <Select
          label="Team Member"
          value={form.team_assignment_id}
          onChange={(e) => setField("team_assignment_id", e.target.value)}
          error={form.error?.team_assignment_id}
          disabled={!!preselectedAssignmentId}
        >
          <option value="">Select a team member…</option>
          {eventAssignments.map((a) => {
            const m = members.find((x) => x.id === a.team_member_id);
            const ev = events.find((e) => e.id === a.event_id);
            const label = event
              ? `${m?.name || "Unknown"} · ${a.role_name_snapshot || "—"} · ${a.agreed_rate != null ? formatCurrency(a.agreed_rate) : "—"}`
              : `${ev?.title || "—"} · ${m?.name || "Unknown"} · ${a.role_name_snapshot || "—"}`;
            return (
              <option key={a.id} value={a.id}>
                {label}
              </option>
            );
          })}
        </Select>
        {selectedAssignment && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Agreed rate:{" "}
            {selectedAssignment.agreed_rate != null
              ? formatCurrency(selectedAssignment.agreed_rate)
              : "—"}
          </p>
        )}
        <TransactionFields form={form} setField={setField} />
      </div>
    </Modal>
  );
}