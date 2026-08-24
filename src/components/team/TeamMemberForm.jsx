import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RATE_TYPES, TEAM_MEMBER_STATUS } from "@/constants/teamConfig";
import { loadActiveRoles } from "@/lib/teamService";

const empty = {
  name: "", phone: "", email: "",
  role_id: "", profession: "",
  default_rate: "", rate_type: "Per Event",
  status: "active", notes: ""
};

export default function TeamMemberForm({ open, onClose, onSaved, member = null, workspaceId }) {
  const [form, setForm] = useState(empty);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(member ? { ...empty, ...member, default_rate: member.default_rate ?? "" } : empty);
      loadRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const loadRoles = async () => {
    if (!workspaceId) return;
    setLoadingRoles(true);
    try {
      const list = await loadActiveRoles(workspaceId);
      setRoles(list);
    } catch (e) {
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onRoleChange = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      setForm((f) => ({
        ...f,
        role_id: role.id,
        profession: role.name,
        default_rate: f.default_rate === "" ? role.default_rate : f.default_rate,
        rate_type: f.rate_type || role.rate_type
      }));
    } else {
      setForm((f) => ({ ...f, role_id: "", profession: "" }));
    }
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
    if (!form.rate_type) return "Please select a rate type.";
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
        phone: form.phone.trim(),
        email: form.email.trim(),
        role_id: form.role_id || "",
        profession: form.profession.trim(),
        default_rate: Number(form.default_rate) || 0,
        rate_type: form.rate_type,
        status: form.status,
        notes: form.notes.trim()
      };
      let saved;
      if (member?.id) {
        saved = await base44.entities.TeamMember.update(member.id, payload);
      } else {
        saved = await base44.entities.TeamMember.create(payload);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save team member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {member ? "Update team member details." : "Add a new team member to your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Shah" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Mobile number" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role / Profession</Label>
            <Select value={form.role_id} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
              <option value="">{loadingRoles ? "Loading roles…" : "Select a role (optional)"}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Input
              value={form.profession}
              onChange={(e) => set("profession", e.target.value)}
              placeholder="Profession (free text)"
              className="mt-1.5"
            />
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
              <option value="active">{TEAM_MEMBER_STATUS.active.label}</option>
              <option value="inactive">{TEAM_MEMBER_STATUS.inactive.label}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : member ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}