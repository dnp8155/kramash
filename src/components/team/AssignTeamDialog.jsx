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
import { findConflicts } from "@/lib/teamService";
import { formatEventDate } from "@/lib/dates";
import { AlertTriangle } from "lucide-react";

export default function AssignTeamDialog({
  open, onClose, onSaved,
  event, workspaceId,
  members = [], roles = [], assignments = [], eventsById = {}
}) {
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overrideConflict, setOverrideConflict] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setMemberId("");
      setRoleId("");
      setAgreedRate("");
      setRateType("Per Event");
      setNotes("");
      setOverrideConflict(false);
    }
  }, [open]);

  const selectedMember = members.find((m) => m.id === memberId);
  const conflicts = memberId && event
    ? findConflicts(memberId, event.start_date, event.end_date, assignments, eventsById, event.id)
    : [];

  const onMemberChange = (id) => {
    setMemberId(id);
    setOverrideConflict(false);
    const m = members.find((x) => x.id === id);
    if (m) {
      setAgreedRate(m.default_rate != null ? String(m.default_rate) : "");
      setRateType(m.rate_type || "Per Event");
      setRoleId(m.role_id || "");
    }
  };

  const onRoleChange = (id) => {
    setRoleId(id);
    const r = roles.find((x) => x.id === id);
    if (r && agreedRate === "") {
      setAgreedRate(String(r.default_rate));
      setRateType(r.rate_type || rateType);
    }
  };

  const validate = () => {
    if (!memberId) return "Please select a team member.";
    if (!rateType) return "Please select a rate type.";
    if (conflicts.length > 0 && !overrideConflict) return "Please confirm the booking conflict to proceed.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      const role = roles.find((r) => r.id === roleId);
      const member = members.find((m) => m.id === memberId);
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        team_member_id: memberId,
        role_id: roleId || "",
        role_name_snapshot: role?.name || member?.profession || "",
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        assignment_status: "assigned",
        notes: notes.trim()
      };
      const saved = await base44.entities.EventTeamAssignment.create(payload);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to assign team member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            {event ? `${event.title} · ${formatEventDate(event.start_date, event.end_date)}` : "Add a team member to this event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Team Member <span className="text-destructive">*</span></Label>
            <Select value={memberId} onChange={(e) => onMemberChange(e.target.value)} className="w-full">
              <option value="">Select a team member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id} disabled={m.status === "inactive"}>
                  {m.name}{m.status === "inactive" ? " (Inactive)" : ""}{m.profession ? ` — ${m.profession}` : ""}
                </option>
              ))}
            </Select>
            {members.length === 0 && (
              <p className="text-xs text-muted-foreground">No team members available. Add members from the Team page.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Role for this event</Label>
            <Select value={roleId} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
              <option value="">Default / no role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agreed Rate (₹)</Label>
              <Input
                type="number"
                min="0"
                value={agreedRate}
                onChange={(e) => setAgreedRate(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full">
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assignment notes (optional)" />
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">
                    {selectedMember?.name} is already assigned to {conflicts.length === 1 ? "another event" : `${conflicts.length} events`} on overlapping date(s):
                  </div>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    {conflicts.map((c) => (
                      <li key={c.id}>{c.title} · {formatEventDate(c.start_date, c.end_date)}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-amber-800">
                <input
                  type="checkbox"
                  checked={overrideConflict}
                  onChange={(e) => setOverrideConflict(e.target.checked)}
                />
                I understand the conflict — assign anyway
              </label>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}