import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { rateTypes } from "@/constants/team";
import { getMemberConflicts, todayStr } from "@/utils/team";
import { dateRange } from "@/utils/dates";
import { formatDate, formatCurrency } from "@/utils/format";
import { paymentMethods } from "@/constants/finance";
import { toast } from "@/components/ui/use-toast";
import SelfBadge from "@/components/common/SelfBadge";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isSelfMember } from "@/utils/selfDetection";

const categoryTypes = ["Bride", "Groom", "Other"];

export default function AssignTeamModal({
  open,
  onClose,
  event,
  members,
  roles,
  assignments,
  events,
  existingMemberIds = [],
  onAssign,
  onUpdate,
  onRecordPayment,
  editingAssignment = null,
  paymentSummary = null,
}) {
  const isEditing = !!editingAssignment;
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [workingDates, setWorkingDates] = useState([]);
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [rateTouched, setRateTouched] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState(false);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  const { ownerName } = useWorkspace();
  const selectedMember = members.find((m) => m.id === memberId);
  const isSelf = isSelfMember(selectedMember?.name, ownerName);

  // Generate available dates from the event's date range
  const eventDates = useMemo(() => {
    if (!event?.start_date) return [];
    return dateRange(event.start_date, event.end_date);
  }, [event?.start_date, event?.end_date]);

  const eventMap = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e])),
    [events]
  );

  useEffect(() => {
    if (!open) return;
    if (isEditing && editingAssignment) {
      // Prefill from existing assignment — do NOT reset.
      // Role is derived from the member's CURRENT role, not the assignment
      // snapshot, so rate calculation always uses the latest Preferences rate.
      const editMember = members.find((m) => m.id === editingAssignment.team_member_id);
      setMemberId(editingAssignment.team_member_id || "");
      setRoleId(editMember?.role_id || editingAssignment.role_id || "");
      setCategoryType(editingAssignment.category_type || "");
      setWorkingDates(editingAssignment.working_dates || (event?.start_date ? [event.start_date] : []));
      setAgreedRate(editingAssignment.agreed_rate != null ? String(editingAssignment.agreed_rate) : "");
      setRateType(editingAssignment.rate_type || "Per Event");
      setRateTouched(false);
      setOverrideConflict(false);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    } else {
      setMemberId("");
      setRoleId("");
      setCategoryType("");
      setWorkingDates(event?.start_date ? [event.start_date] : []);
      setAgreedRate("");
      setRateType("Per Event");
      setRateTouched(false);
      setOverrideConflict(false);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    }
  }, [open, isEditing, editingAssignment, event?.id, event?.start_date]);

  const selectableMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.status === "Active" &&
          (!existingMemberIds.includes(m.id) || (isEditing && editingAssignment?.team_member_id === m.id))
      ),
    [members, existingMemberIds, isEditing, editingAssignment]
  );

  const conflicts = useMemo(() => {
    if (!memberId || !event) return [];
    return getMemberConflicts(memberId, event, assignments, eventMap);
  }, [memberId, event, assignments, eventMap]);

  // Calculate rate from working dates × daily rate (when Per Day)
  const calculateRate = (type, dates, dailyRate) => {
    if (type === "Per Day" && dates.length > 0 && dailyRate) {
      return dates.length * Number(dailyRate);
    }
    return dailyRate || "";
  };

  const getDailyRate = (mid, rid) => {
    const member = members.find((m) => m.id === mid);
    const role = roles.find((r) => r.id === rid);
    return role?.default_rate ?? member?.default_rate ?? "";
  };

  // Warn when the selected member's role has no rate configured in Preferences.
  const rateMissing =
    !!memberId && !!roleId && getDailyRate(memberId, roleId) === "";

  const handleMemberChange = (id) => {
    setMemberId(id);
    const member = members.find((m) => m.id === id);
    const role = roles.find((r) => r.id === (member?.role_id || ""));
    const newRateType = role?.rate_type || member?.rate_type || "Per Event";
    const dailyRate = role?.default_rate ?? member?.default_rate ?? "";
    setRoleId(member?.role_id || "");
    setRateType(newRateType);
    if (!rateTouched) {
      setAgreedRate(calculateRate(newRateType, workingDates, dailyRate));
    }
    setOverrideConflict(false);
  };

  const handleWorkingDateToggle = (date) => {
    setWorkingDates((prev) => {
      const next = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort();
      // Recalculate rate when working dates change — but only if the user
      // hasn't manually edited the rate field.
      if (!rateTouched) {
        setAgreedRate(calculateRate(rateType, next, getDailyRate(memberId, roleId)));
      }
      return next;
    });
  };

  const handleRateTypeChange = (type) => {
    setRateType(type);
    if (!rateTouched) {
      setAgreedRate(calculateRate(type, workingDates, getDailyRate(memberId, roleId)));
    }
  };

  const handleRateChange = (e) => {
    setAgreedRate(e.target.value);
    setRateTouched(true);
  };

  const handleSave = async () => {
    if (!memberId) {
      toast({ title: "Select a team member", variant: "destructive" });
      return;
    }
    if (!roleId) {
      toast({
        title: "No role assigned",
        description: "This team member has no role. Assign a role in the Team master or Preferences first.",
        variant: "destructive",
      });
      return;
    }
    if (workingDates.length === 0) {
      toast({ title: "Select at least one working date", variant: "destructive" });
      return;
    }
    if (!isEditing && conflicts.length > 0 && !overrideConflict) {
      toast({
        title: "Booking conflict",
        description: "Acknowledge the conflict to assign anyway.",
        variant: "destructive",
      });
      return;
    }
    const role = roles.find((r) => r.id === roleId);

    // Validate payment fields if Record Payment is ON (add mode only)
    const amt = Number(paymentAmount);
    if (recordPayment && (!paymentAmount || Number.isNaN(amt) || amt <= 0)) {
      toast({ title: "Enter a valid payment amount", variant: "destructive" });
      return;
    }
    if (recordPayment && !paymentDate) {
      toast({ title: "Select a payment date", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        team_member_id: memberId,
        role_id: roleId,
        role_name_snapshot: role?.name || "",
        agreed_rate: agreedRate === "" ? null : Number(agreedRate),
        rate_type: rateType,
        working_dates: workingDates,
        category_type: categoryType || null,
      };

      if (isEditing) {
        // Update the existing assignment — payments are NOT affected.
        // They remain linked via team_assignment_id.
        await onUpdate(editingAssignment.id, payload);
        toast({ title: "Team assignment updated" });
      } else {
        const assignment = await onAssign({
          ...payload,
          event_id: event.id,
        });

        // Create payment transaction if Record Payment is ON (add mode only).
        if (recordPayment && onRecordPayment && assignment) {
          try {
            await onRecordPayment({
              transaction_type: "TEAM_PAYMENT",
              event_id: event.id,
              team_member_id: memberId,
              team_assignment_id: assignment.id,
              amount: amt,
              payment_method: paymentMethod,
              transaction_date: paymentDate,
            });
            toast({ title: "Team member assigned and payment recorded" });
          } catch (paymentErr) {
            toast({
              title: "Team member assigned — payment failed",
              description: paymentErr?.message,
              variant: "destructive",
            });
          }
        } else {
          toast({ title: "Team member assigned" });
        }
      }
      onClose();
    } catch (e) {
      toast({ title: isEditing ? "Update failed" : "Assignment failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Team Assignment" : "Assign Team Member"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {isEditing && (
          <p className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
            This edits the event-specific assignment. The team member's master
            profile and default rate are not changed. Existing payments remain
            intact.
          </p>
        )}

        <Select
          label="Team Member"
          value={memberId}
          onChange={(e) => handleMemberChange(e.target.value)}
          disabled={isEditing}
        >
          <option value="">Select a member…</option>
          {selectableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.profession ? ` — ${m.profession}` : ""}
            </option>
          ))}
        </Select>
        {isEditing && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Member cannot be changed in edit mode. Remove and re-assign to swap.
          </p>
        )}
        {!isEditing && selectableMembers.length === 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">
            All active team members are already assigned to this event.
          </p>
        )}
        {isSelf && (
          <p className="-mt-2 flex items-center gap-1.5 text-xs text-primary">
            <SelfBadge /> Workspace owner — no payment required
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Role is read-only — derived from the selected Team Member's
              configured Role in Preferences. Not independently selectable. */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Role
            </label>
            <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-foreground">
              {roleId
                ? roles.find((r) => r.id === roleId)?.name || "—"
                : memberId
                  ? "No role assigned to this member"
                  : "Select a member first"}
            </div>
          </div>
          <Select
            label="Type"
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value)}
          >
            <option value="">Select type…</option>
            {categoryTypes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>

        {/* Working Dates */}
        {eventDates.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Working Date{eventDates.length > 1 ? "s" : ""}
            </label>
            <div className="flex flex-wrap gap-2">
              {eventDates.map((date) => (
                <label
                  key={date}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                    workingDates.includes(date)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={workingDates.includes(date)}
                    onChange={() => handleWorkingDateToggle(date)}
                    className="h-3.5 w-3.5"
                  />
                  {formatDate(date)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={
              rateType === "Per Day"
                ? `Agreed Rate (${workingDates.length} day${workingDates.length !== 1 ? "s" : ""})`
                : "Agreed Rate"
            }
            name="agreed_rate"
            type="number"
            min="0"
            value={agreedRate}
            onChange={handleRateChange}
            placeholder="0"
          />
          <Select
            label="Rate Type"
            value={rateType}
            onChange={(e) => handleRateTypeChange(e.target.value)}
          >
            {rateTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        {rateMissing && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" /> Rate not configured
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rate not configured for this role. Please configure the role rate
              in Preferences → Team Roles.
            </p>
          </div>
        )}

        {/* Payment summary in edit mode */}
        {isEditing && paymentSummary && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">Payment Summary</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-semibold text-foreground">{formatCurrency(paymentSummary.paid || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-semibold text-foreground">{formatCurrency(paymentSummary.remaining || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold text-foreground">{paymentSummary.status || "—"}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Payments are not affected by editing this assignment. Use the Pay
              button on the event page to record new payments.
            </p>
          </div>
        )}

        {/* Record Payment toggle (add mode only) — hidden for SELF */}
        {!isEditing && onRecordPayment && !isSelf && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(e) => setRecordPayment(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Record Payment Now
            </label>
            {recordPayment && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        {!isEditing && isSelf && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-3">
            <p className="text-xs text-muted-foreground">
              This team member is the workspace owner (SELF). No payment is
              recorded — the assignment amount is treated as the owner's
              internal profit share, not an external payable.
            </p>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" /> Booking conflict
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This member is already assigned to another event overlapping this
              date range:
            </p>
            <ul className="mt-2 space-y-1">
              {conflicts.map(({ event: ev }) => (
                <li key={ev.id} className="text-xs text-foreground">
                  • {ev.title} — {formatDate(ev.start_date)}
                  {ev.end_date ? ` → ${formatDate(ev.end_date)}` : ""}
                </li>
              ))}
            </ul>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={overrideConflict}
                onChange={(e) => setOverrideConflict(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Assign anyway despite the conflict
            </label>
          </div>
        )}

        {event && (
          <p className="text-xs text-muted-foreground">
            Event date: {formatDate(event.start_date)}
            {event.end_date ? ` → ${formatDate(event.end_date)}` : ""}
          </p>
        )}
      </div>
    </Modal>
  );
}