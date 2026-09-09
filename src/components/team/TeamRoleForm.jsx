import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { rateTypes } from "@/constants/team";
import { toast } from "@/components/ui/use-toast";

const empty = {
  name: "",
  default_rate: "",
  rate_type: "Per Event",
  status: "active",
};

export default function TeamRoleForm({ open, onClose, role, onSave }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        role
          ? {
              ...empty,
              ...role,
              default_rate: role.default_rate ?? "",
            }
          : empty
      );
    }
  }, [open, role?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        default_rate: form.default_rate === "" ? null : Number(form.default_rate),
        rate_type: form.rate_type,
        status: form.status,
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
      title={role ? "Edit Role" : "Add Role"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {role ? "Save Changes" : "Add Role"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Role Name"
          name="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Drone Operator"
          className="sm:col-span-2"
        />
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
          className="sm:col-span-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
    </Modal>
  );
}