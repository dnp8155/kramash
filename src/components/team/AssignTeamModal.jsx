import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { rateTypes } from "@/constants/team";
import { getMemberConflicts } from "@/utils/team";
import { formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

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
}) {
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Per Event");
  const [overrideConflict, setOverrideConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const eventMap = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e])),
    [events]
  );

  useEffect(() => {
    if (open) {
      setMemberId("");
      setRoleId("");
      setAgreedRate("");
      setRateType("Per Event");
      setOverrideConflict(false);
    }
  }, [open, event?.id]);

  const selectableMembers = useMemo(
    () =>
      members.filter(
        (m) => m.status === "Active" && !existingMemberIds.includes(m.id)
      ),
    [members, existingMemberIds]
  );

  const conflicts = useMemo(() => {
    if (!memberId || !event) return [];
    return getMemberConflicts(memberId, event, assignments, eventMap);
  }, [memberId, event, assignments, eventMap]);

  const handleMemberChange = (id) => {
    setMemberId(id);
    const member = members.find((m) => m.id === id);
    const role = roles.find((r) => r.id === (member?.role_id || ""));
    setRoleId(member?.role_id || "");
    setRateType(role?.rate_type || member?.rate_type || "Per Event");
    setAgreedRate(
      role?.default_rate ?? member?.default_rate ?? ""
    );
    setOverrideConflict(false);
  };

  const handleSave = async () => {
    if (!memberId) {
      toast({ title: "Select a team member", variant: "destructive" });
      return;
    }
    if (!roleId) {
      toast({ title: "Select a role", variant: "destructive" });
      return;
    }
    if (conflicts.length > 0 && !overrideConflict) {
      toast({
        title: "Booking conflict",
        description: "Acknowledge the conflict to assign anyway.",
        variant: "destructive",
      });
      return;
    }
    const role = roles.find((r) => r.id === roleId);
    setSaving(true);
    try {
      await onAssign({
        team_member_id: memberId,
        role_id: roleId,
        role_name_snapshot: role?.name || "",
        agreed_rate: agreedRate === "" ? null : Number(agreedRate),
        rate_type: rateType,
      });
      onClose();
    } catch (e) {
      toast({ title: "Assignment failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Team Member"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Select
          label="Team Member"
          value={memberId}
          onChange={(e) => handleMemberChange(e.target.value)}
        >
          <option value="">Select a member…</option>
          {selectableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.profession ? ` — ${m.profession}` : ""}
            </option>
          ))}
        </Select>
        {selectableMembers.length === 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">
            All active team members are already assigned to this event.
          </p>
        )}

        <Select
          label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
        >
          <option value="">Select a role…</option>
          {roles
            .filter((r) => r.status === "active")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Agreed Rate"
            name="agreed_rate"
            type="number"
            min="0"
            value={agreedRate}
            onChange={(e) => setAgreedRate(e.target.value)}
            placeholder="0"
          />
          <Select
            label="Rate Type"
            value={rateType}
            onChange={(e) => setRateType(e.target.value)}
          >
            {rateTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

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