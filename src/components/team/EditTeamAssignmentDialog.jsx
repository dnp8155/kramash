import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";
import { formatEventDate, parseISODate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_MEMBER_TYPES = [
  { id: "mt1", title: "Bride Side", color: "#ec4899" },
  { id: "mt2", title: "Groom Side", color: "#3b82f6" },
  { id: "mt3", title: "Common", color: "#6b7280" },
];

// EditTeamAssignmentDialog — edits an EXISTING EventTeamAssignment record.
// Does NOT touch the TeamMember master record or any FinancialTransaction payments.
// Only the assignment-level fields (role, type, working dates, rate, notes) are editable.
export default function EditTeamAssignmentDialog({
  open, onClose, onSaved,
  assignment, event, workspace, workspaceId,
  member, roles = []
}) {
  const [roleId, setRoleId] = useState("");
  const [memberTypeId, setMemberTypeId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [workingDates, setWorkingDates] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);

  const memberTypes = useMemo(() => {
    try {
      const parsed = workspace?.team_member_types ? JSON.parse(workspace.team_member_types) : null;
      return parsed && Array.isArray(parsed) ? parsed : DEFAULT_MEMBER_TYPES;
    } catch {
      return DEFAULT_MEMBER_TYPES;
    }
  }, [workspace]);

  // Event's available dates (event_dates array or fallback to start_date)
  const eventDates = useMemo(() => {
    const dates = event?.event_dates?.length ? event.event_dates : (event?.start_date ? [event.start_date] : []);
    return [...dates].sort();
  }, [event]);

  // Prefill from the assignment when the dialog opens
  useEffect(() => {
    if (open && assignment) {
      setError("");
      setRoleId(assignment.role_id || "");
      setMemberTypeId(assignment.member_type_id || "");
      setAgreedRate(String(assignment.agreed_rate ?? ""));
      setRateType(assignment.rate_type || "Per Event");
      setWorkingDates(Array.isArray(assignment.working_dates) ? [...assignment.working_dates].sort() : []);
      setNotes(assignment.notes || "");
      setRateManuallyEdited(false);
    }
  }, [open, assignment]);

  // Toggle a working date — recalculates suggested rate for Per Day if user hasn't manually overridden
  const toggleWorkingDate = (date) => {
    setWorkingDates((prev) => {
      const has = prev.includes(date);
      const next = has ? prev.filter((d) => d !== date) : [...prev, date].sort();
      // Auto-recalculate only for Per Day rate type AND only if user hasn't manually edited the rate
      if (rateType === "Per Day" && !rateManuallyEdited && member?.default_rate != null) {
        const days = next.length || 1;
        setAgreedRate(String(Number(member.default_rate) * days));
      }
      return next;
    });
  };

  const onRateTypeChange = (newType) => {
    setRateType(newType);
    // Recalculate suggested rate when switching to Per Day (only if not manually edited)
    if (newType === "Per Day" && !rateManuallyEdited && member?.default_rate != null) {
      const days = workingDates.length || 1;
      setAgreedRate(String(Number(member.default_rate) * days));
    } else if (newType !== "Per Day" && !rateManuallyEdited && member?.default_rate != null) {
      setAgreedRate(String(member.default_rate));
    }
  };

  const onRateChange = (val) => {
    setAgreedRate(val);
    setRateManuallyEdited(true);
  };

  const validate = () => {
    if (!rateType) return "Please select a rate type.";
    if (workingDates.length === 0) return "Please select at least one working date.";
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return "Rate must be a valid non-negative number.";
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
      const mType = memberTypes.find((t) => t.id === memberTypeId);
      const sortedDates = [...workingDates].sort();
      const payload = {
        role_id: roleId || "",
        role_name_snapshot: role?.name || member?.profession || assignment?.role_name_snapshot || "",
        member_type_id: memberTypeId || "",
        member_type_snapshot: mType?.title || "",
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        working_dates: sortedDates,
        booking_start_date: sortedDates[0] || event?.start_date || "",
        booking_end_date: sortedDates[sortedDates.length - 1] || sortedDates[0] || event?.start_date || "",
        notes: notes.trim()
      };
      // Only update the assignment — payments are NOT touched
      const saved = await base44.entities.EventTeamAssignment.update(assignment.id, payload);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to update assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Assignment</DialogTitle>
          <DialogDescription>
            {event ? `${event.title} · ${formatEventDate(event.start_date, event.end_date)}` : "Update this event assignment."}
          </DialogDescription>
        </DialogHeader>

        {/* Info banner — clarifies this edits the assignment, not the master record */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            Editing the event assignment for <span className="font-semibold">{member?.name || "this member"}</span>.
            This does not change the team member's master record or any existing payments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Member name — read-only */}
          <div className="space-y-1.5">
            <Label>Team Member</Label>
            <div className="px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border">
              {member?.name || "Unknown member"}
              {member?.profession ? ` — ${member.profession}` : ""}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full">
                <option value="">Default / no role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={memberTypeId} onChange={(e) => setMemberTypeId(e.target.value)} className="w-full">
                <option value="">No type</option>
                {memberTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Working Dates */}
          <div className="space-y-1.5">
            <Label>Working Date(s) <span className="text-destructive">*</span></Label>
            {eventDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {eventDates.map((d) => {
                  const selected = workingDates.includes(d);
                  const dt = parseISODate(d);
                  const day = dt?.getDate();
                  const month = dt?.toLocaleString("en-IN", { month: "short" });
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWorkingDate(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {day} {month}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No event dates available. Set dates on the event first.</p>
            )}
            {workingDates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {workingDates.length} day(s) selected
                {rateType === "Per Day" && member?.default_rate
                  ? ` · Suggested: ${formatMoney(Number(member.default_rate) * workingDates.length, "INR")}`
                  : ""}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agreed Rate (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={agreedRate}
                onChange={(e) => onRateChange(e.target.value)}
                placeholder="0"
              />
              {rateType === "Per Day" && member?.default_rate && (
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(member.default_rate, "INR")}/day × {workingDates.length || 1} = {formatMoney(Number(member.default_rate) * (workingDates.length || 1), "INR")}
                  {rateManuallyEdited && " · manually overridden"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={rateType} onChange={(e) => onRateTypeChange(e.target.value)} className="w-full">
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assignment notes (optional)" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}