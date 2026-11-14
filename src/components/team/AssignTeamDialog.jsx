import { useState, useEffect, useMemo, useRef } from "react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import DialogContextCard from "@/components/common/DialogContextCard";
import { fmtShort } from "@/components/common/DateRangeChips";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { Label } from "@/components/ui/label";
import { RATE_TYPES } from "@/constants/teamConfig";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import { findDateConflicts, isSelfMember } from "@/lib/teamService";
import { suggestedRate } from "@/lib/suggestedRate";
import { createTeamAssignment, recordPayment } from "@/lib/clientEdgeFunctions";
import { formatEventDate, todayISO } from "@/lib/dates";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { formatMoney } from "@/utils/format";
import { AlertTriangle, Ban, Wallet, Crown, Plus, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { getMemberTypes } from "@/lib/memberTypeService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";
import { useT } from "@/hooks/useT";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import { invalidateRelated } from "@/lib/queryInvalidation";

export default function AssignTeamDialog({
  open, onClose, onSaved, onFlush,
  event, workspaceId, workspace,
  members = [], roles: rolesProp = [], assignments = [], eventsById = {}, blockDates = [],
  onAddMember
}) {
  const t = useT();
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [addedRoles, setAddedRoles] = useState([]);
  const roles = useMemo(() => [...rolesProp, ...addedRoles.filter((a) => !rolesProp.some((r) => r.id === a.id))], [rolesProp, addedRoles]);
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [memberTypeId, setMemberTypeId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [workingDates, setWorkingDates] = useState([]);
  const [notes, setNotes] = useState("");
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const [overrideConflict, setOverrideConflict] = useState(false);
  const [addedList, setAddedList] = useState([]);
  const dirty = useRef(false);
  // Refetching is held back while adding several in a row; it runs once when the dialog closes.
  const closeDialog = () => {
    if (dirty.current) {
      dirty.current = false;
      invalidateEntities(queryClient, ["EventTeamAssignment", "FinancialTransaction", "Event"]);
      onFlush?.();
    }
    onClose?.();
  };
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const { fiscalYears } = useFinancialYear();
  const queryClient = useQueryClient();
  const currency = workspace?.currency || "INR";

  const memberTypes = useMemo(() => getMemberTypes(workspace), [workspace]);

  const eventDates = useMemo(() => {
    const dates = event?.event_dates?.length ? event.event_dates : (event?.start_date ? [event.start_date] : []);
    return [...dates].sort();
  }, [event]);

  // Initialise only when the dialog opens. A background refetch of the event (new object identity)
  // must not wipe what the user has already picked or typed.
  const wasOpen = useRef(false);
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (justOpened) {
      setAddedList([]);
      setError("");
      setRateManuallyEdited(false);
      setMemberId("");
      setRoleId("");
      setMemberTypeId("");
      setAgreedRate("");
      setRateType("Per Event");
      setWorkingDates(eventDates.length > 0 ? [eventDates[0]] : []);
      setNotes("");
      setOverrideConflict(false);
      setRecordPaymentNow(false);
      setPaymentAmount("");
      setPaymentDate(todayISO());
      setPaymentMethod("Cash");
    }
  }, [open, eventDates]);

  const selectedMember = members.find((m) => m.id === memberId);
  const selectedMemberIsSelf = isSelfMember(selectedMember);
  // Only the dates picked below count, not the event's full start→end range.
  const conflicts = memberId && event
    ? findDateConflicts(memberId, workingDates, assignments, eventsById, event.id)
    : [];

  const alreadyAssigned = useMemo(() => {
    if (!memberId || !assignments) return false;
    return assignments.some((a) => a.event_id === event?.id && a.team_member_id === memberId && a.assignment_status !== "removed");
  }, [memberId, assignments, event]);

  const selfMember = useMemo(() => members.find((m) => isSelfMember(m)), [members]);
  const selfAlreadyAssigned = useMemo(() => {
    if (!selfMember || !assignments) return false;
    return assignments.some((a) => a.event_id === event?.id && a.team_member_id === selfMember.id && a.assignment_status !== "removed");
  }, [selfMember, assignments, event]);
  const assignedIds = useMemo(() => new Set((assignments || []).filter((a) => a.event_id === event?.id && a.assignment_status !== "removed").map((a) => a.team_member_id)), [assignments, event]);
  const availableMembers = members.filter((m) => !assignedIds.has(m.id) && !(selfAlreadyAssigned && isSelfMember(m)));

  // Who is already on each date of this event (shown under the date chips).
  const crewByDate = useMemo(() => {
    const out = {};
    (assignments || []).filter((a) => a.event_id === event?.id && a.assignment_status !== "removed").forEach((a) => {
      const name = members.find((m) => m.id === a.team_member_id)?.name;
      if (!name) return;
      const days = a.working_dates?.length ? a.working_dates : eventDates;
      days.forEach((d) => { (out[d] ||= []).push({ id: a.team_member_id, name }); });
    });
    return out;
  }, [assignments, event, members, eventDates]);

  const blockConflicts = useMemo(() => {
    if (!memberId || !event) return [];
    const hits = [];
    for (const iso of workingDates) {
      const blk = (blockDates || []).find((b) =>
        b.team_member_id === memberId && b.status !== "cancelled" &&
        iso >= b.start_date && iso <= (b.end_date || b.start_date)
      );
      if (blk) hits.push(blk);
    }
    return hits;
  }, [memberId, event, blockDates, workingDates]);

  const workingDayCount = workingDates.length || 1;
  const selectedRole = roles.find((r) => r.id === roleId);
  const roleRate = selectedRole?.default_rate;
  const roleRateConfigured = selectedRole != null && Number(selectedRole.default_rate) > 0;

  const calcSuggestedRate = suggestedRate;

  const onMemberChange = (id) => {
    setMemberId(id);
    setOverrideConflict(false);
    setRecordPaymentNow(false);
    const m = members.find((x) => x.id === id);
    if (m) {
      setRateManuallyEdited(false);
      const rid = m.role_id || "";
      setRoleId(rid);
      setMemberTypeId("");
      const role = roles.find((r) => r.id === rid);
      const rt = role?.rate_type || "Per Event";
      setRateType(rt);
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggestedRate(rt, role?.default_rate, days));
    }
  };

  const toggleWorkingDate = (date) => {
    const has = workingDates.includes(date);
    const next = has ? workingDates.filter((d) => d !== date) : [...workingDates, date].sort();
    setWorkingDates(next);
    if (rateType === "Per Day" && selectedRole && !rateManuallyEdited) {
      setAgreedRate(calcSuggestedRate("Per Day", selectedRole.default_rate, next.length || 1));
    }
  };

  const onRoleChange = (id, created) => {
    setRoleId(id);
    const r = created || roles.find((x) => x.id === id);
    if (r) {
      setRateManuallyEdited(false);
      const rt = r.rate_type || "Per Event";
      setRateType(rt);
      const days = workingDates.length || 1;
      setAgreedRate(calcSuggestedRate(rt, r.default_rate, days));
    }
  };

  // A role created from here joins the list and is selected right away.
  const onRoleCreated = (saved) => {
    if (!saved?.id) return;
    setAddedRoles((prev) => [...prev, saved]);
    invalidateRelated(queryClient, "TeamRole");
    onRoleChange(saved.id, saved);
  };

  const validate = () => {
    if (!memberId) return t("Please select a team member.");
    if (selectedMemberIsSelf && selfAlreadyAssigned) return t("Owner / Self is already assigned to this event.");
    if (alreadyAssigned) return `${selectedMember?.name || t("This member")} ${t("is already assigned to this event. A team member can only be assigned once per event.")}`;
    if (!roleId) return t("Please select a role.");
    if (!rateType) return t("Please select a rate type.");
    if (workingDates.length === 0) return t("Please select at least one working date.");
    if (conflicts.length > 0 && !overrideConflict) return t("Please confirm the booking conflict to proceed.");
    if (blockConflicts.length > 0 && !overrideConflict) return t("This member has blocked dates — please confirm to proceed.");
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return t("Rate must be a valid non-negative number.");
    if (recordPaymentNow) {
      const pAmt = Number(paymentAmount);
      if (!paymentAmount || isNaN(pAmt) || pAmt <= 0) return t("Payment amount must be greater than zero.");
      if (!paymentDate) return t("Please select a payment date.");
      if (!paymentMethod) return t("Please select a payment method.");
      const fy = resolveFYForDate(paymentDate, fiscalYears);
      if (!fy) return t("No Financial Year is available for this payment date. Please create the applicable Financial Year first.");
    }
    return "";
  };

  const resetForNext = () => {
    setError(""); setRateManuallyEdited(false); setMemberId(""); setRoleId(""); setMemberTypeId("");
    setAgreedRate(""); setRateType("Per Event"); setWorkingDates(eventDates.length > 0 ? [eventDates[0]] : []);
    setNotes(""); setOverrideConflict(false); setRecordPaymentNow(false); setPaymentAmount("");
    setPaymentDate(todayISO()); setPaymentMethod("Cash");
  };

  const handleSubmit = async (e, another = false) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!assertOnline()) return;
    if (!start()) return;
    setError("");
    try {
      const role = roles.find((r) => r.id === roleId);
      const member = members.find((m) => m.id === memberId);
      const mType = memberTypes.find((mt) => mt.id === memberTypeId);
      const sortedDates = [...workingDates].sort();
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        team_member_id: memberId,
        role_id: roleId || null,
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
      const saved = await createTeamAssignment(payload);
      if (recordPaymentNow) {
        const fy = resolveFYForDate(paymentDate, fiscalYears);
        if (!fy) {
          setError(t("No Financial Year is available for this payment date. Please create the applicable Financial Year first."));
          return;
        }
        await recordPayment({
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
      if (another) {
        dirty.current = true;
        onSaved?.(saved, { silent: true });
      } else {
        invalidateEntities(queryClient, ["EventTeamAssignment", "FinancialTransaction", "Event"]);
        dirty.current = false;
        onSaved?.(saved);
      }
      if (another) {
        setAddedList((l) => [...l, { id: memberId, name: member?.name || "", dates: sortedDates }]);
        resetForNext();
      } else {
        onClose?.();
      }
    } catch (err) {
      const data = err?.data || err;
      if (data?.error === "SELF_ALREADY_ASSIGNED") {
        setError(data.message || t("Owner / Self is already assigned to this event."));
      } else if (data?.error === "ALREADY_ASSIGNED") {
        setError(data.message || t("This member is already assigned to this event."));
      } else {
        setError(err?.message || t("Failed to assign team member. Please try again."));
      }
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{t("Assign Team Member")}</AppDialogTitle>
          <AppDialogDescription>{t("Add a team member to this event.")}</AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <DialogContextCard event={event} compact />
            {Object.keys(crewByDate).length > 0 && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" /> {t("Team on this event")}
                  {addedList.length > 0 && <span className="ml-auto text-[11px] font-medium text-primary">{addedList.length} {t("added just now")}</span>}
                </div>
                {eventDates.map((d) => (
                  <div key={d} className="flex items-start gap-2">
                    <span className="w-[76px] shrink-0 text-xs font-medium text-muted-foreground leading-6">{fmtShort(d)}</span>
                    <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                      {crewByDate[d]?.length ? crewByDate[d].map((c) => {
                        const isNew = addedList.some((x) => x.id === c.id);
                        return (
                          <span key={c.id} className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            isNew ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-foreground"
                          )}>
                            {isNew && <Check className="w-3 h-3" />}{c.name}
                          </span>
                        );
                      }) : <span className="text-xs text-muted-foreground leading-6">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("Team Member")} <span className="text-destructive">*</span></Label>
              <Select value={memberId} onChange={(e) => onMemberChange(e.target.value)} className="w-full">
                <option value="">{t("Select a team member")}</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.status === "inactive"}>
                    {m.name}{m.status === "inactive" ? ` (${t("Inactive")})` : ""}{m.profession ? ` — ${m.profession}` : ""}
                  </option>
                ))}
              </Select>
              {members.length === 0 && <p className="text-xs text-muted-foreground">{t("No team members available.")}{!onAddMember && ` ${t("Add members from the Team page.")}`}</p>}
              {onAddMember && (
                <button type="button" onClick={onAddMember} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" />{t("Add new team member")}
                </button>
              )}
              {selfAlreadyAssigned && <p className="text-xs text-muted-foreground">{t("Owner (Self) is already assigned to this event and cannot be added again.")}</p>}
              {alreadyAssigned && <p className="text-xs text-destructive font-medium">{selectedMember?.name} {t("is already assigned to this event.")}</p>}
              {selectedMemberIsSelf && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Crown className="w-3.5 h-3.5" />
                  {t("Workspace Owner (Self) — owner share, no external payment.")}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Role")} <span className="text-destructive">*</span></Label>
                <Select value={roleId} onChange={(e) => onRoleChange(e.target.value)} className="w-full">
                  <option value="" disabled>{t("Select a role")}</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
                <button type="button" onClick={() => setRoleFormOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" />{t("Add role")}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Type")}</Label>
                <Select value={memberTypeId} onChange={(e) => setMemberTypeId(e.target.value)} className="w-full">
                  <option value="">{t("No type")}</option>
                  {memberTypes.map((mt) => <option key={mt.id} value={mt.id}>{mt.title}</option>)}
                </Select>
                <div className="flex flex-wrap gap-1.5">
                  {memberTypes.map((mt) => (
                    <span key={mt.id} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mt.color }} />
                      {mt.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Working Date(s)")} <span className="text-destructive">*</span></Label>
              {eventDates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {eventDates.map((d) => {
                    const selected = workingDates.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWorkingDate(d)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                          selected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {fmtShort(d)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("No event dates available. Set dates on the event first.")}</p>
              )}
              {workingDates.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {workingDates.length} {t("day(s) selected")}
                  {rateType === "Per Day" && roleRateConfigured ? ` · ${t("Calculated")}: ${formatMoney(Number(roleRate) * workingDates.length, currency)}` : ""}
                </p>
              )}
              {selectedRole && !roleRateConfigured && (
                <p className="text-xs text-warning">
                  {t("Rate not configured for the")} "{selectedRole.name}" {t("role. Please configure the role rate in Preferences.")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Agreed Rate")} (₹)</Label>
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={agreedRate} onChange={(e) => { setAgreedRate(e.target.value); setRateManuallyEdited(true); }} placeholder="0" />
                {rateType === "Per Day" && roleRateConfigured && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatMoney(roleRate, "INR")}/{t("day")} × {workingDayCount} = {formatMoney(Math.round(Number(roleRate) * workingDayCount * 100) / 100, "INR")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("Rate Type")}</Label>
                <Select value={rateType} onChange={(e) => {
                  const newType = e.target.value;
                  setRateType(newType);
                  if (selectedRole) {
                    setRateManuallyEdited(false);
                    const days = workingDates.length || 1;
                    setAgreedRate(calcSuggestedRate(newType, selectedRole.default_rate, days));
                  }
                }} className="w-full">
                  {RATE_TYPES.map((r) => <option key={r} value={r}>{t(r)}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Assignment notes (optional)")} />
            </div>

            {!selectedMemberIsSelf && <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <Label className={cn(!selectedMemberIsSelf && "cursor-pointer")}>{t("Record Payment Now")}</Label>
                </div>
                <Toggle checked={recordPaymentNow && !selectedMemberIsSelf} onChange={selectedMemberIsSelf ? () => {} : setRecordPaymentNow} label={t("Record Payment")} />
              </div>
              {selectedMemberIsSelf ? (
                <p className="text-xs text-muted-foreground">
                  {t("The workspace owner cannot be paid as a team member — this assignment is treated as owner share.")}
                </p>
              ) : recordPaymentNow && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">{t("Creates a team payment transaction. Financial Year is auto-assigned from the payment date.")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("Payment Amount")} (₹) <span className="text-destructive">*</span></Label>
                      <Input type="number" inputMode="decimal" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("Payment Date")} <span className="text-destructive">*</span></Label>
                      <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("Payment Method")} <span className="text-destructive">*</span></Label>
                    <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full">
                      {PAYMENT_METHOD_LIST.map((m) => <option key={m} value={m}>{t(m)}</option>)}
                    </Select>
                  </div>
                  {paymentDate && (() => {
                    const fy = resolveFYForDate(paymentDate, fiscalYears);
                    return fy ? (
                      <p className="text-xs text-muted-foreground">
                        {t("Will be recorded under")} <span className="font-medium text-foreground">{fy.fy_id}</span> ({fy.label})
                      </p>
                    ) : (
                      <p className="text-xs text-destructive">{t("No Financial Year covers this date. Create the applicable FY first.")}</p>
                    );
                  })()}
                </div>
              )}
            </div>}

            {conflicts.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-semibold">
                      {selectedMember?.name} {t("is already assigned to")} {conflicts.length === 1 ? t("another event") : `${conflicts.length} ${t("events")}`} {t("on overlapping date(s):")}
                    </div>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      {conflicts.map((c) => <li key={c.event.id}>{c.event.title} · {c.dates.map((d) => formatEventDate(d)).join(", ")}</li>)}
                    </ul>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-amber-800">
                  <input type="checkbox" checked={overrideConflict} onChange={(e) => setOverrideConflict(e.target.checked)} />
                  {t("I understand the conflict — assign anyway")}
                </label>
              </div>
            )}

            {blockConflicts.length > 0 && (
              <div className="rounded-md border border-slate-300 bg-slate-50 p-3 space-y-2">
                <div className="flex items-start gap-2 text-slate-700">
                  <Ban className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-semibold">{selectedMember?.name} {t("has blocked dates on the selected days:")}</div>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      {[...new Map(blockConflicts.map((b) => [b.id, b])).values()].map((b) => (
                        <li key={b.id}>{formatEventDate(b.start_date, b.end_date)}{b.reason ? ` — ${b.reason}` : ""}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {conflicts.length === 0 && (
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={overrideConflict} onChange={(e) => setOverrideConflict(e.target.checked)} />
                    {t("I understand the block — assign anyway")}
                  </label>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>{addedList.length ? t("Done") : t("Cancel")}</Button>
            <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, true)} disabled={saving}>{t("Save & add more")}</Button>
            <Button type="submit" disabled={saving}>{saving ? t("Assigning…") : t("Assign")}</Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
      <TeamRoleForm open={roleFormOpen} onClose={() => setRoleFormOpen(false)} onSaved={onRoleCreated} workspaceId={workspaceId} />
    </AppDialog>
  );
}