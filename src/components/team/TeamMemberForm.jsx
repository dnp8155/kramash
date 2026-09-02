import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TEAM_MEMBER_STATUS } from "@/constants/teamConfig";
import { loadActiveRoles, clearOtherSelfMembers } from "@/lib/teamService";
import { useAuth } from "@/lib/AuthContext";
import { Crown } from "lucide-react";

// Master Team Member form — identity + role + contact + status + notes only.
// Rate and Member Type are NOT collected here:
//  - Rate is derived from the selected Role's configuration in Preferences.
//  - Member Type is event-specific (selected at Event assignment time).
// "This is me" marks the member as the workspace owner's own roster entry (SELF).
const empty = {
  name: "", phone: "", email: "",
  role_id: "", profession: "",
  is_self: false,
  status: "active", notes: ""
};

export default function TeamMemberForm({ open, onClose, onSaved, member = null, workspaceId }) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      const base = member ? { ...empty, ...member } : empty;
      // Auto-suggest SELF when the entered email matches the logged-in owner.
      // This is only a hint — the user explicitly confirms via the toggle.
      if (!member && user?.email && base.email && base.email.toLowerCase() === user.email.toLowerCase()) {
        base.is_self = true;
      }
      setForm(base);
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

  // Selecting a Role caches the role_id and profession (name snapshot).
  // The Role's configured rate stays in Preferences — it is NOT copied here.
  const onRoleChange = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      setForm((f) => ({ ...f, role_id: role.id, profession: role.name }));
    } else {
      setForm((f) => ({ ...f, role_id: "", profession: "" }));
    }
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.role_id) return "Please select a Role / Profession.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      // Enforce a single SELF per workspace: clear any other Self members first.
      if (form.is_self) {
        try {
          await clearOtherSelfMembers(workspaceId, member?.id || null);
        } catch (e) {
          /* non-fatal — backend/RLS will still scope correctly */
        }
      }
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        role_id: form.role_id || "",
        profession: form.profession.trim(),
        is_self: !!form.is_self,
        status: form.status,
        notes: form.notes.trim()
      };
      let saved;
      if (member?.id) {
        saved = await base44.entities.TeamMember.update(member.id, payload);
      } else {
        const res = await base44.functions.invoke("createTeamMember", payload);
        saved = res.data;
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.response?.data || err;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        setError(`Your Free Plan team limit has been reached (${data.current}/${data.limit}). Upgrade to Pro to add more team members.`);
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        setError(data.error);
      } else {
        setError(err?.message || "Failed to save team member. Please try again.");
      }
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
            {member ? "Update team member details." : "Add a person to your workspace team roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter team member name" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Mobile Number (optional)</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Enter mobile number" />
          </div>

          <div className="space-y-1.5">
            <Label>Email (optional)</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter email" />
          </div>

          <div className="space-y-1.5">
            <Label>Role / Profession <span className="text-destructive">*</span></Label>
            <Select value={form.role_id} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
              <option value="">{loadingRoles ? "Loading roles…" : "Select a role"}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            {roles.length === 0 && !loadingRoles && (
              <p className="text-xs text-muted-foreground">No roles configured. Add roles in Preferences.</p>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <Label className="cursor-pointer">This is me (workspace owner)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marks this member as you. Self members cannot be paid as external team — their rate is treated as owner share.
                  </p>
                </div>
              </div>
              <Toggle checked={!!form.is_self} onChange={(v) => set("is_self", v)} label="Self" />
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
            <Label>Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Add notes" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : member ? "Save Changes" : "Add to Roster"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}