import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const empty = { name: "", default_rate: "", rate_type: "Per Event", status: "active" };

export default function TeamRoleForm({ open, onClose, onSaved, role = null, workspaceId }) {
  const [form, setForm] = useState(empty);
  const { saving, start, stop } = useSubmitGuard();
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
    if (!start()) return;
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
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{role ? "Edit Role" : "Add Role"}</AppDialogTitle>
          <AppDialogDescription>
            {role ? "Update this team role." : "Create a new team role for your workspace."}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
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
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : role ? "Save Changes" : "Add Role"}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}