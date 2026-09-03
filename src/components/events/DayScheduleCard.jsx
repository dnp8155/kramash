import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { isAssignedToDate } from "@/lib/dates";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Briefcase, Loader2, AlertTriangle, Check } from "lucide-react";

const DAY_STATUS = {
  planned: { label: "Planned", cls: "bg-muted text-muted-foreground border-border" },
  confirmed: { label: "Confirmed", cls: "bg-primary/10 text-primary border-primary/30" },
  done: { label: "Done", cls: "bg-success/10 text-success border-success/30" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive border-destructive/30" }
};

function fmtDate(d) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short", day: "2-digit", month: "short"
    });
  } catch { return d; }
}

// props:
//  event, date, workspaceId, members, services,
//  allDayAssignments (this event's day assignments),
//  otherEventsById, otherDayAssignments (for conflict check),
//  blockDates, onChanged
export default function DayScheduleCard({
  event, date, workspaceId,
  members = [], services = [],
  eventAssignments = [],
  dayAssignments = [],
  otherDayAssignments = [],
  blockDates = [],
  onChanged
}) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  // local editable state (team is derived from the Team tab; services persist on
  // the per-day schedule record and are shown read-only, date-filtered).
  const [serviceIds, setServiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("planned");
  const [venueOverride, setVenueOverride] = useState("");

  useEffect(() => {
    const existing = dayAssignments.find((a) => a.date === date);
    if (existing) {
      setRecord(existing);
      setServiceIds(existing.service_ids || []);
      setNotes(existing.notes || "");
      setStatus(existing.status || "planned");
      setVenueOverride(existing.venue_override || "");
    } else {
      setRecord(null);
      setServiceIds([]);
      setNotes("");
      setStatus("planned");
      setVenueOverride("");
    }
    setDirty(false);
    setError("");
    setLoading(false);
  }, [date, dayAssignments]);

  // Team members actually assigned to THIS date — pulled from the Team tab's
  // date-mapped assignments (working_dates / booking range / event dates).
  const dayTeamMembers = useMemo(() => {
    const memberMap = {};
    members.forEach((m) => { memberMap[m.id] = m; });
    return eventAssignments
      .filter((a) => isAssignedToDate(a, date, event))
      .map((a) => memberMap[a.team_member_id])
      .filter(Boolean);
  }, [eventAssignments, members, date, event]);

  // Services scheduled for THIS date — from the per-day schedule record.
  const dayServices = useMemo(() => {
    const serviceMap = {};
    services.forEach((s) => { serviceMap[s.id] = s; });
    return (serviceIds || []).map((id) => serviceMap[id]).filter(Boolean);
  }, [serviceIds, services]);

  // conflict detection: team member booked elsewhere on this date or blocked
  const conflictsByMember = useMemo(() => {
    const map = {};
    // other events' assignments for this date
    otherDayAssignments.forEach((a) => {
      if (a.date === date && a.event_id !== event.id) {
        (a.team_member_ids || []).forEach((mid) => {
          if (!map[mid]) map[mid] = [];
          map[mid].push({ type: "event", event_id: a.event_id });
        });
      }
    });
    // block dates
    blockDates.forEach((b) => {
      if (b.status !== "active") return;
      if (date >= b.start_date && date <= (b.end_date || b.start_date)) {
        if (!map[b.team_member_id]) map[b.team_member_id] = [];
        map[b.team_member_id].push({ type: "block", reason: b.reason });
      }
    });
    return map;
  }, [otherDayAssignments, blockDates, date, event.id]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        date,
        team_member_ids: dayTeamMembers.map((m) => m.id),
        service_ids: serviceIds,
        notes: notes.trim(),
        status,
        venue_override: venueOverride.trim()
      };
      let saved;
      if (record?.id) {
        saved = await base44.entities.EventDayAssignment.update(record.id, payload);
        setRecord(saved);
      } else {
        saved = await base44.entities.EventDayAssignment.create(payload);
        setRecord(saved);
      }
      setDirty(false);
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Failed to save day plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dayTeamIds = dayTeamMembers.map((m) => m.id);
  const hasConflicts = dayTeamIds.some((id) => conflictsByMember[id]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{fmtDate(date)}</div>
            <div className="text-xs text-muted-foreground">
              {dayTeamMembers.length} team · {dayServices.length} service{dayServices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <span className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full border",
          DAY_STATUS[status]?.cls || DAY_STATUS.planned.cls
        )}>
          {DAY_STATUS[status]?.label || "Planned"}
        </span>
      </div>

      {/* Conflict warning */}
      {hasConflicts && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-warning">
            {dayTeamIds.filter((id) => conflictsByMember[id]).map((id) => {
              const m = members.find((x) => x.id === id);
              return m?.name || "Unknown";
            }).join(", ")} {"has scheduling conflicts on this day."}
          </div>
        </div>
      )}

      {/* Team — read-only, date-filtered from the Team tab assignments */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5" /> Team for this day
        </Label>
        {dayTeamMembers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dayTeamMembers.map((m) => (
              <span
                key={m.id}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                  conflictsByMember[m.id]
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {m.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No team assigned for this day.</p>
        )}
      </div>

      {/* Services — read-only, date-filtered from the per-day schedule */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Briefcase className="w-3.5 h-3.5" /> Services for this day
        </Label>
        {dayServices.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dayServices.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center rounded-full border bg-muted text-foreground border-border px-2.5 py-1 text-xs font-medium"
              >
                {s.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No services added for this day.</p>
        )}
      </div>

      {/* Status quick toggle */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(DAY_STATUS).map(([key, info]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatus(key); markDirty(); }}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
              status === key
                ? info.cls + " ring-1 ring-ring/30"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {status === key && <Check className="w-3 h-3 inline mr-1" />}
            {info.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">Day notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); markDirty(); }}
          placeholder="What's happening this day? (e.g. Haldi ceremony, outdoor shoot)"
          rows={2}
          className="text-sm"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors",
            dirty
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : dirty ? "Save day plan" : "Saved"}
        </button>
      </div>
    </div>
  );
}