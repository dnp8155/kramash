import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import { findConflicts, isSelfMember } from "@/lib/teamService";
import { formatEventDate, parseISODate, toISODate, todayISO } from "@/lib/dates";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { formatMoney } from "@/utils/format";
import { AlertTriangle, Ban, Wallet, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_MEMBER_TYPES = [
  { id: "mt1", title: "Bride Side", color: "#ec4899" },
  { id: "mt2", title: "Groom Side", color: "#3b82f6" },
  { id: "mt3", title: "Common", color: "#6b7280" },
];

export default function AssignTeamDialog({
  open, onClose, onSaved,
  event, workspaceId, workspace,
  members = [], roles = [], assignments = [], eventsById = {}, blockDates = []
}) {
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [memberTypeId, setMemberTypeId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [workingDates, setWorkingDates] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overrideConflict, setOverrideConflict] = useState(false);
  // Record Payment
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const { fiscalYears } = useFinancialYear();
  const currency = workspace?.currency || "INR";

  // Parse member types from workspace config
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

  useEffect(() => {
    if (open) {
      setError("");
      setMemberId("");
      setRoleId("");
      setMemberTypeId("");
      setAgreedRate("");
      setRateType("Per Event");
      setWorkingDates(eventDates.length > 0 ? [eventDates[0]] : []);
      setNotes("");
      setOverrideConflict(false);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayISO());
      setPaymentMethod("Cash");
    }
  }, [open, event]);

  const selectedMember = members.find((m) => m.id === memberId);
  const selectedMemberIsSelf = isSelfMember(selectedMember);
  const conflicts = memberId && event
    ? findConflicts(memberId, event.start_date, event.end_date, assignments, eventsById, event.id)
    : [];

  // Unique member check — same member can't be assigned twice to the same event
  const alreadyAssigned = useMemo(() => {
    if (!memberId || !assignments) return false;
    return assignments.some(
      (a) => a.event_id === event?.id && a.team_member_id === memberId && a.assignment_status !== "removed"
    );
  }, [memberId, assignments, event]);

  // Block-date conflicts
  const blockConflicts = useMemo(() => {
    if (!memberId || !event) return [];
    const start = parseISODate(event.start_date);
    const end = parseISODate(event.end_date || event.start_date);
    if (!start || !end) return [];
    const hits = [];
    let cur = new Date(start);
    while (cur <= end) {
      const iso = toISODate(cur);
      const blk = (blockDates || []).find((b) =>
        b.team_member_id === memberId && b.status !== "cancelled" &&
        iso >= b.start_date && iso <= (b.end_date || b.start_date)
      );
      if (blk) hits.push(blk);
      cur.setDate(cur.getDate() + 1);
    }
    return hits;
  }, [memberId, event, blockDates]);

  // Number of selected working dates
  const workingDayCount = workingDates.length || 1;

  // Resolve the Role record for the currently selected member.
  // The Role's configured rate (from Preferences) is the source of truth —
  // the Team Member master record does NOT carry its own rate.
  const selectedRole = roles.find((r) => r.id === roleId);
  const roleRate = selectedRole?.default_rate;
  const roleRateConfigured = selectedRole != null && Number(selectedRole.default_rate) > 0;

  const calcSuggestedRate = (rt, rate, days) => {
    if (rate == null) return "";
    if (rt === "Per Day") return String(Number(rate) * (days || 1));
    return String(Number(rate));
  };

  const onMemberChange = (id) => {
    setMemberId(id);
    setOverrideConflict(false);
    setRecordPayment(false);
    const m = members.find((x) => x.id === id);
    if (m) {
      const rid = m.role_id || "";
      setRoleId(rid);
      setMemberTypeId(""); // Member Type is event-specific — start blank
      const role = roles.find((r) => r.id === rid);
      const rt = role?.rate_type || "Per Event";
      setRateType(rt);
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggestedRate(rt, role?.default_rate, days));
    }
  };

  const toggleWorkingDate = (date) => {
    setWorkingDates((prev) => {
      const has = prev.includes(date);
      const next = has ? prev.filter((d) => d !== date) : [...prev, date].sort();
      // Recalculate if Per Day, using the Role's configured rate
      if (rateType === "Per Day" && selectedRole) {
        const days = next.length || 1;
        setAgreedRate(calcSuggestedRate("Per Day", selectedRole.default_rate, days));
      }
      return next;
    });
  };

  const onRoleChange = (id) => {
    setRoleId(id);
    const r = roles.find((x) => x.id === id);
    if (r) {
      const rt = r.rate_type || "Per Event";
      setRateType(rt);
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggestedRate(rt, r.default_rate, days));
    }
  };

  const validate = () => {
    if (!memberId) return "Please select a team member.";
    if (alreadyAssigned) return `${selectedMember?.name || "This member"} is already assigned to this event. A team member can only be assigned once per event.`;
    if (!rateType) return "Please select a rate type.";
    if (workingDates.length === 0) return "Please select at least one working date.";
    if (conflicts.length > 0 && !overrideConflict) return "Please confirm the booking conflict to proceed.";
    if (blockConflicts.length > 0 && !overrideConflict) return "This member has blocked dates — please confirm to proceed.";
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return "Rate must be a valid non-negative number.";
    if (recordPayment) {
      const pAmt = Number(paymentAmount);
      if (!paymentAmount || isNaN(pAmt) || pAmt <= 0) return "Payment amount must be greater than zero.";
      if (!paymentDate) return "Please select a payment date.";
      if (!paymentMethod) return "Please select a payment method.";
      const fy = resolveFYForDate(paymentDate, fiscalYears);
      if (!fy) return "No Financial Year is available for this payment date. Please create the applicable Financial Year first.";
    }
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
      const mType = memberTypes.find((t) => t.id === memberTypeId);
      const sortedDates = [...workingDates].sort();
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        team_member_id: memberId,
        role_id: roleId || "",
        role_name_snapshot: role?.name || member?.profession || "",
        member_type_id: memberTypeId || "",
        member_type_snapshot: mType?.title || "",
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        working_dates: sortedDates,
        booking_start_date: sortedDates[0] || event?.start_date || "",
        booking_end_date: sortedDates[sortedDates.length - 1] || sortedDates[0] || event?.start_date || "",
        assignment_status: "assigned",
        notes: notes.trim()
      };
      const saved = await base44.entities.EventTeamAssignment.create(payload);
      // Keep event.team_member_ids in sync
      const currentIds = Array.isArray(event?.team_member_ids) ? event.team_member_ids : [];
      if (!currentIds.includes(memberId)) {
        await base44.entities.Event.update(event.id, { team_member_ids: [...currentIds, memberId] });
      }
      // Record payment if enabled (routed through backend for SELF guard)
      if (recordPayment) {
        const fy = resolveFYForDate(paymentDate, fiscalYears);
        if (!fy) {
          setError("No Financial Year is available for this payment date. Please create the applicable Financial Year first.");
          setSaving(false);
          return;
        }
        await base44.functions.invoke("recordPayment", {
          kind: "team",
          workspace_id: workspaceId,
          event_id: event.id,
          assignment_id: saved.id,
          team_member_id: memberId,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          transaction_date: paymentDate,
          notes: `Payment for ${role?.name || member?.profession || "assignment"}${mType ? ` (${mType.title})` : ""}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
          financial_year_id: fy.id
        });
      }
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
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
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
            {alreadyAssigned && (
              <p className="text-xs text-destructive font-medium">
                {selectedMember?.name} is already assigned to this event.
              </p>
            )}
            {selectedMemberIsSelf && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Crown className="w-3.5 h-3.5" />
                Workspace Owner (Self) — owner share, no external payment.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleId} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
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

          {/* Working Dates — multi-select from event's available dates */}
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
                {rateType === "Per Day" && roleRateConfigured
                  ? ` · Calculated: ${formatMoney(Number(roleRate) * workingDates.length, currency)}`
                  : ""}
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
              <Input
                type="number"
                min="0"
                step="0.01"
                value={agreedRate}
                onChange={(e) => setAgreedRate(e.target.value)}
                placeholder="0"
              />
              {rateType === "Per Day" && roleRateConfigured && (
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(roleRate, "INR")}/day × {workingDayCount} = {formatMoney(Number(roleRate) * workingDayCount, "INR")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={rateType} onChange={(e) => {
                const newType = e.target.value;
                setRateType(newType);
                if (selectedRole) {
                  const days = workingDates.length || 1;
                  setAgreedRate(calcSuggestedRate(newType, selectedRole.default_rate, days));
                }
              }} className="w-full">
                {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assignment notes (optional)" />
          </div>

          {/* Record Payment toggle — disabled for Self (owner) */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <Label className={cn(!selectedMemberIsSelf && "cursor-pointer")}>Record Payment Now</Label>
              </div>
              <Toggle
                checked={recordPayment && !selectedMemberIsSelf}
                onChange={selectedMemberIsSelf ? () => {} : setRecordPayment}
                label="Record Payment"
              />
            </div>
            {selectedMemberIsSelf ? (
              <p className="text-xs text-muted-foreground">
                The workspace owner cannot be paid as a team member — this assignment is treated as owner share.
              </p>
            ) : recordPayment && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Creates a team payment transaction. Financial Year is auto-assigned from the payment date.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Amount (₹) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method <span className="text-destructive">*</span></Label>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full">
                    {PAYMENT_METHOD_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </div>
                {paymentDate && (() => {
                  const fy = resolveFYForDate(paymentDate, fiscalYears);
                  return fy ? (
                    <p className="text-xs text-muted-foreground">
                      Will be recorded under <span className="font-medium text-foreground">{fy.fy_id}</span> ({fy.label})
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">
                      No Financial Year covers this date. Create the applicable FY first.
                    </p>
                  );
                })()}
              </div>
            )}
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

          {blockConflicts.length > 0 && (
            <div className="rounded-md border border-slate-300 bg-slate-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-slate-700">
                <Ban className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">
                    {selectedMember?.name} has blocked dates overlapping this event:
                  </div>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    {[...new Map(blockConflicts.map((b) => [b.id, b])).values()].map((b) => (
                      <li key={b.id}>{formatEventDate(b.start_date, b.end_date)}{b.reason ? ` — ${b.reason}` : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {conflicts.length === 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={overrideConflict}
                    onChange={(e) => setOverrideConflict(e.target.checked)}
                  />
                  I understand the block — assign anyway
                </label>
              )}
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