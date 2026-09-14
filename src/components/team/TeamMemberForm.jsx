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
import { TEAM_MEMBER_STATUS, RATE_TYPES } from "@/constants/teamConfig";
import { loadActiveRoles, loadTeamMembers } from "@/lib/teamService";
import { useAuth } from "@/lib/AuthContext";
import { Crown, Lock } from "lucide-react";
import { isValidIndianPhone, isValidEmail } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

// Master Team Member form — identity + role + contact + status + notes only.
// Rate and Member Type are NOT collected here:
//  - Rate is derived from the selected Role's configuration in Preferences.
//  - Member Type is event-specific (selected at Event assignment time).
// "This is me" marks the member as the workspace owner's own roster entry (SELF).
const empty = {
  name: "", phone: "", email: "",
  role_id: "", profession: "",
  default_rate: "", rate_type: "Per Event",
  is_self: false,
  color: "",
  status: "active", notes: ""
};

export default function TeamMemberForm({ open, onClose, onSaved, member = null, workspaceId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const [existingSelf, setExistingSelf] = useState(null); // the workspace's current self member (if any)

  useEffect(() => {
    if (open) {
      setError("");
      const base = member ? { ...empty, ...member } : empty;
      setForm(base);
      loadRoles();
      loadExistingSelf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const loadExistingSelf = async () => {
    if (!workspaceId) { setExistingSelf(null); return; }
    try {
      const list = await loadTeamMembers(workspaceId);
      const self = list.find((m) => m.is_self === true && m.id !== member?.id);
      setExistingSelf(self || null);
    } catch (e) {
      setExistingSelf(null);
    }
  };

  // Self is locked when:
  //  - this member already has is_self (can't unset), OR
  //  - another member in the workspace already has is_self (can't set a second)
  const selfLocked = !!member?.is_self || !!existingSelf;

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
  // Also fetches the Role's configured Default Rate and Rate Type and populates
  // them onto the member — but only when the role has a non-zero default_rate,
  // so an existing manually-set rate is never wiped by a rate-less role.
  const onRoleChange = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      const roleRate = Number(role.default_rate) || 0;
      setForm((f) => ({
        ...f,
        role_id: role.id,
        profession: role.name,
        rate_type: role.rate_type || f.rate_type || "Per Event",
        default_rate: roleRate > 0 ? String(roleRate) : (f.default_rate || "")
      }));
    } else {
      setForm((f) => ({ ...f, role_id: "", profession: "" }));
    }
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.role_id) return "Please select a Role / Profession.";
    if (form.phone && !isValidIndianPhone(form.phone)) return "Enter a valid Indian mobile number (10 digits, starts with 6-9).";
    if (form.email && !isValidEmail(form.email)) return "Enter a valid email address.";
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
        phone: form.phone.trim(),
        email: form.email.trim(),
        role_id: form.role_id || "",
        profession: form.profession.trim(),
        default_rate: Number(form.default_rate) || 0,
        rate_type: form.rate_type || "Per Event",
        is_self: !!form.is_self,
        color: form.color || "",
        status: form.status,
        notes: form.notes.trim()
      };
      let saved;
      if (member?.id) {
        saved = await base44.entities.TeamMember.update(member.id, payload);
      } else {
        const res = await base44.functions.invoke("createTeamMember", payload);
        saved = res?.data || res;
      }
      invalidateEntity(queryClient, "TeamMember");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      const data = err?.data || err;
      if (data?.error === "PLAN_LIMIT_REACHED") {
        setError(`Your Free Plan team limit has been reached (${data.current}/${data.limit}). Upgrade to Pro to add more team members.`);
      } else if (data?.error === "Self is already assigned to another member in this workspace.") {
        setError(data.error);
      } else if (data?.error === "This workspace is suspended. Please contact support.") {
        setError(data.error);
      } else {
        setError(err?.message || "Failed to save team member. Please try again.");
      }
    } finally {
      stop();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
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
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile (e.g. 9876543210)" inputMode="tel" maxLength="13" />
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
              {(() => {
                const role = roles.find((r) => r.id === form.role_id);
                return role && Number(role.default_rate) > 0
                  ? <p className="text-[11px] text-muted-foreground">From "{role.name}" role</p>
                  : null;
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={form.rate_type} onChange={(e) => set("rate_type", e.target.value)} className="w-full">
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <Label className={cn("cursor-pointer", selfLocked && "cursor-not-allowed opacity-70")}>
                    This is me (workspace owner)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {member?.is_self
                      ? "Self cannot be removed once set."
                      : existingSelf
                        ? `Self is already assigned to ${existingSelf.name}.`
                        : "Marks this member as you. Self members cannot be paid as external team — their rate is treated as owner share."}
                  </p>
                </div>
              </div>
              {selfLocked ? (
                <div className="flex items-center gap-1.5 text-muted-foreground" title={member?.is_self ? "Locked — cannot remove Self" : "Locked — already assigned"}>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{form.is_self ? "On" : "Off"}</span>
                </div>
              ) : (
                <Toggle checked={!!form.is_self} onChange={(v) => set("is_self", v)} label="Self" />
              )}
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