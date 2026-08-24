import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";

const empty = { name: "", default_rate: "", rate_type: "Per Event", status: "active" };

export default function TeamRoleForm({ open, onClose, onSaved, role = null, workspaceId }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(role ? { ...empty, ...role, default_rate: role.default_rate ?? "" } : empty);
    }
  }, [open, role]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Role name is required.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        default_rate: Number(form.default_rate) || 0,
        rate_type: form.rate_type,
        status: form.status
      };
      let saved;
      if (role?.id) {
        saved = await base44.entities.TeamRole.update(role.id, payload);
      } else {
        saved = await base44.entities.TeamRole.create(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save role. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Add Role"}</DialogTitle>
          <DialogDescription>
            {role ? "Update this team role." : "Create a new team role for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Role Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Drone Operator" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default Rate (₹)</Label>
              <Input
                type="number"
                min="0"
                value={form.default_rate}
                onChange={(e) => set("default_rate", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={form.rate_type} onChange={(e) => set("rate_type", e.target.value)} className="w-full">
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : role ? "Save Changes" : "Add Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}