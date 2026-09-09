import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { teamMemberStatuses } from "@/constants/team";
import { toast } from "@/components/ui/use-toast";

// Master Team Member form — identity + role + contact + status + notes.
// Rate is NOT collected here; it comes from the Role configuration in
// Preferences. See AssignTeamModal for event-level rate calculation.
const empty = {
  name: "",
  phone: "",
  email: "",
  role_id: "",
  status: "Active",
  notes: "",
};

export default function TeamMemberForm({
  open,
  onClose,
  member,
  roles,
  onSave,
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        member
          ? {
              ...empty,
              ...member,
              role_id: member.role_id || "",
            }
          : empty
      );
    }
  }, [open, member?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const role = roles.find((r) => r.id === form.role_id);
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        role_id: form.role_id || null,
        profession: role?.name || form.profession || "",
        status: form.status,
        notes: form.notes.trim(),
      });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? "Edit Team Member" : "Add Team Member"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {member ? "Save Changes" : "Add to Roster"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Enter team member name"
          className="sm:col-span-2"
        />
        <Input
          label="Mobile Number (optional)"
          name="phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Enter mobile number"
        />
        <Input
          label="Email (optional)"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Enter email"
        />
        <Select
          label="Role / Profession"
          value={form.role_id}
          onChange={(e) => set("role_id", e.target.value)}
        >
          <option value="">Select a role…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.status === "inactive" ? " (inactive)" : ""}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {teamMemberStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Add notes"
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Rate is determined by the selected Role / Profession configuration in
          Preferences. You can override it per event when assigning.
        </p>
      </div>
    </Modal>
  );
}