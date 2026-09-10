import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { teamMemberStatuses, rateTypes } from "@/constants/team";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isSelfMember } from "@/utils/selfDetection";

// Master Team Member form — identity + role + contact + rate + status + notes.
// Rate is collected here as the member's default; it can be overridden per
// event when assigning. The "This is me / Self" toggle marks the member as
// the workspace owner for wage-exclusion logic.
const empty = {
  name: "",
  phone: "",
  email: "",
  role_id: "",
  is_self: false,
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
  const { ownerName } = useWorkspace();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      member
        ? {
            ...empty,
            ...member,
            role_id: member.role_id || "",
            is_self: !!member.is_self,
            default_rate:
              member.default_rate != null ? String(member.default_rate) : "",
            rate_type: member.rate_type || "Per Event",
          }
        : empty
    );
  }, [open, member?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRoleChange = (roleId) => {
    set("role_id", roleId);
    // Auto-populate default rate and rate type from the role if the user
    // hasn't manually entered a rate yet.
    const role = roles.find((r) => r.id === roleId);
    if (role && !form.default_rate) {
      set("default_rate", role.default_rate != null ? String(role.default_rate) : "");
    }
    if (role && form.rate_type === "Per Event") {
      set("rate_type", role.rate_type || "Per Event");
    }
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    // Basic email validation
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast({ title: "Invalid email format", variant: "destructive" });
      return;
    }
    // Validate rate
    const rateNum = form.default_rate === "" ? null : Number(form.default_rate);
    if (rateNum !== null && (Number.isNaN(rateNum) || rateNum < 0)) {
      toast({ title: "Default rate must be 0 or greater", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const role = roles.find((r) => r.id === form.role_id);
      // Auto-detect SELF: if the entered name matches the workspace owner,
      // set is_self = true automatically.
      const autoSelf = isSelfMember(trimmedName, ownerName);
      await onSave({
        name: trimmedName,
        phone: form.phone.trim(),
        email: form.email.trim(),
        role_id: form.role_id || null,
        profession: role?.name || form.profession || "",
        is_self: autoSelf || form.is_self,
        default_rate: rateNum ?? 0,
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

  const isAutoSelf = isSelfMember(form.name, ownerName);

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
        <Select
          label="Rate Type"
          value={form.rate_type}
          onChange={(e) => set("rate_type", e.target.value)}
        >
          {rateTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Input
          label="Default Rate (optional)"
          name="default_rate"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={form.default_rate}
          onChange={(e) => set("default_rate", e.target.value)}
          placeholder="0"
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {teamMemberStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        {/* Self toggle — auto-detected when name matches owner */}
        <div className="flex items-center gap-2 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.is_self || isAutoSelf}
              disabled={isAutoSelf}
              onChange={(e) => set("is_self", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            This is me / Self (workspace owner)
          </label>
          {isAutoSelf && (
            <span className="text-xs text-muted-foreground">
              Auto-detected from name match
            </span>
          )}
        </div>
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
          Default rate is a suggestion — it can be overridden per event when
          assigning. Changing it does not affect existing assignments.
        </p>
      </div>
    </Modal>
  );
}