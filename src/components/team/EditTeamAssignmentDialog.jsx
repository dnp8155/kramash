import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import DialogContextCard from "@/components/common/DialogContextCard";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";
import { parseISODate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { Info, Crown } from "lucide-react";
import { isSelfMember } from "@/lib/teamService";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { getMemberTypes } from "@/lib/memberTypeService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";

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
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);
  const queryClient = useQueryClient();

  const memberTypes = useMemo(() => getMemberTypes(workspace), [workspace]);

  const eventDates = useMemo(() => {
    const dates = event?.event_dates?.length ? event.event_dates : (event?.start_date ? [event.start_date] : []);
    return [...dates].sort();
  }, [event]);

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

  const selectedRole = roles.find((r) => r.id === roleId);
  const roleRate = selectedRole?.default_rate;
  const roleRateConfigured = selectedRole != null && Number(selectedRole.default_rate) > 0;

  const calcSuggested = (rt, rate, days) => {
    if (rate == null) return "";
    if (rt === "Per Day") return String(Number(rate) * (days || 1));
    return String(Number(rate));
  };

  const toggleWorkingDate = (date) => {
    setWorkingDates((prev) => {
      const has = prev.includes(date);
      const next = has ? prev.filter((d) => d !== date) : [...prev, date].sort();
      if (rateType === "Per Day" && !rateManuallyEdited && roleRate != null) {
        const days = next.length || 1;
        setAgreedRate(calcSuggested("Per Day", roleRate, days));
      }
      return next;
    });
  };

  const onRateTypeChange = (newType) => {
    setRateType(newType);
    if (!rateManuallyEdited && roleRate != null) {
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggested(newType, roleRate, days));
    }
  };

  const onRoleChange = (id) => {
    setRoleId(id);
    const r = roles.find((x) => x.id === id);
    if (r && !rateManuallyEdited) {
      const rt = r.rate_type || rateType;
      setRateType(rt);
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggested(rt, r.default_rate, days));
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
    if (!assertOnline()) return;
    if (!start()) return;
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
      const saved = await base44.entities.EventTeamAssignment.update(assignment.id, payload);
      invalidateEntity(queryClient, "EventTeamAssignment");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to update assignment. Please try again.");
    } finally {
      stop();
    }
  };

  if (!assignment) return null;

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>Edit Team Assignment</AppDialogTitle>
          <AppDialogDescription>Update this event assignment.</AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <DialogContextCard event={event} />
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Editing the event assignment for <span className="font-semibold">{member?.name || "this member"}</span>.
                This does not change the team member's master record or any existing payments.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Team Member</Label>
              <div className="px-3 py-2 rounded-lg bg-muted/50 text-sm font-medium text-foreground border border-border flex items-center gap-1.5">
                {isSelfMember(member) && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
                {member?.name || "Unknown member"}
                {member?.profession ? ` — ${member.profession}` : ""}
                {isSelfMember(member) && <span className="text-xs text-primary font-semibold">(Self)</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={roleId} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
                  <option value="">Default / no role</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={memberTypeId} onChange={(e) => setMemberTypeId(e.target.value)} className="w-full">
                  <option value="">No type</option>
                  {memberTypes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
              </div>
            </div>

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
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
                  {rateType === "Per Day" && roleRateConfigured ? ` · Suggested: ${formatMoney(Number(roleRate) * workingDates.length, "INR")}` : ""}
                </p>
              )}
              {selectedRole && !roleRateConfigured && (
                <p className="text-xs text-warning">
                  Rate not configured for the "{selectedRole.name}" role. Please configure the role rate in Preferences.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Agreed Rate (₹)</Label>
                <Input type="number" min="0" step="0.01" value={agreedRate} onChange={(e) => onRateChange(e.target.value)} placeholder="0" />
                {rateType === "Per Day" && roleRateConfigured && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatMoney(roleRate, "INR")}/day × {workingDates.length || 1} = {formatMoney(Number(roleRate) * (workingDates.length || 1), "INR")}
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
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}