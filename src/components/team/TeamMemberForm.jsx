import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { rateTypes, teamMemberStatuses } from "@/constants/team";
import { toast } from "@/components/ui/use-toast";

const empty = {
  name: "",
  phone: "",
  email: "",
  role_id: "",
  default_rate: "",
  rate_type: "Per Event",
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
              default_rate: member.default_rate ?? "",
              role_id: member.role_id || "",
            }
          : empty
      );
    }
  }, [open, member?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRoleChange = (roleId) => {
    set("role_id", roleId);
    // Auto-fill rate from the role when adding a new member and no rate set yet.
    if (!member) {
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        setForm((f) => ({
          ...f,
          role_id: roleId,
          default_rate: f.default_rate === "" ? role.default_rate ?? "" : f.default_rate,
          rate_type: role.rate_type || f.rate_type,
          profession: f.profession === "" ? role.name : f.profession,
        }));
      }
    }
  };

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
        profession: role?.name || form.profession?.trim() || "",
        default_rate: form.default_rate === "" ? null : Number(form.default_rate),
        rate_type: form.rate_type,
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
            {member ? "Save Changes" : "Add Member"}
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
          placeholder="Full name"
          className="sm:col-span-2"
        />
        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+91 98200 11223"
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Select
          label="Role / Profession"
          value={form.role_id}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          <option value="">Select a role…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.status === "inactive" ? " (inactive)" : ""}
            </option>
          ))}
        </Select>
        <Input
          label="Default Rate"
          name="default_rate"
          type="number"
          min="0"
          value={form.default_rate}
          onChange={(e) => set("default_rate", e.target.value)}
          placeholder="0"
        />
        <Select
          label="Rate Type"
          value={form.rate_type}
          onChange={(e) => set("rate_type", e.target.value)}
        >
          {rateTypes.map((t) => (
            <option key={t} value={t}>
              {t}
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
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any notes about this team member…"
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </Modal>
  );
}