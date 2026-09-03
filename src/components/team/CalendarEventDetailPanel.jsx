import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatEventDates, isAssignedToDate } from "@/lib/dates";
import { Calendar, Users, Briefcase, ArrowRight, Crown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// Detail panel shown when a calendar date with events is clicked.
// Lists each event on that date with its team (date-filtered) and services
// (from the per-day schedule), plus a "View Event" button.
export default function CalendarEventDetailPanel({
  date,
  events = [],
  members = [],
  assignments = [],
  serviceAssignments = [],
  dayAssignments = [],
  services = [],
  onEventClick
}) {
  const navigate = useNavigate();

  const memberMap = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);
  const serviceMap = useMemo(() => {
    const m = {}; services.forEach((x) => { m[x.id] = x; }); return m;
  }, [services]);

  // For each event on this date, compute the team and services for that date.
  const eventDetails = useMemo(() => {
    return events.map((ev) => {
      const evAssignments = (assignments || []).filter(
        (a) => a.event_id === ev.id && a.assignment_status !== "removed"
      );
      const team = evAssignments
        .filter((a) => isAssignedToDate(a, date, ev))
        .map((a) => ({ member: memberMap[a.team_member_id], assignment: a }))
        .filter((x) => x.member);

      const dayRec = (dayAssignments || []).find(
        (a) => a.event_id === ev.id && a.date === date
      );
      const svcIds = dayRec?.service_ids || [];
      const providerBySvcId = {};
      (serviceAssignments || []).forEach((a) => {
        if (a.event_id === ev.id && a.assignment_status !== "removed")
          providerBySvcId[a.service_id] = a.provider_name_snapshot;
      });
      const svcs = svcIds
        .map((id) => ({ service: serviceMap[id], provider: providerBySvcId[id] }))
        .filter((x) => x.service);

      return { event: ev, team, services: svcs };
    });
  }, [events, assignments, dayAssignments, serviceAssignments, memberMap, serviceMap, date]);

  const dateLabel = (() => {
    try {
      return new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
    } catch { return date; }
  })();

  const handleViewEvent = (ev) => {
    if (onEventClick) onEventClick(ev);
    else navigate(`/events/${ev.id}`);
  };

  if (eventDetails.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Calendar className="w-3.5 h-3.5" />
        {dateLabel}
      </div>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto -mr-1 pr-1">
        {eventDetails.map(({ event: ev, team, services: svcs }) => (
          <div key={ev.id} className="border border-border rounded-lg p-3 bg-muted/30">
            {/* Event header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{ev.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {ev.event_type && (
                    <span className="inline-flex items-center gap-0.5">
                      <Tag className="w-3 h-3" /> {ev.event_type}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" /> {formatEventDates(ev)}
                  </span>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Users className="w-3 h-3" /> Team
              </div>
              {team.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {team.map(({ member: m, assignment: a }) => {
                    const side = a?.member_type_snapshot;
                    return (
                      <span
                        key={m.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                          m.is_self
                            ? "bg-warning/10 text-warning border-warning/30"
                            : "bg-primary/10 text-primary border-primary/20"
                        )}
                      >
                        {m.is_self && <Crown className="w-2.5 h-2.5 text-warning shrink-0" />}
                        {m.name}
                        {m.is_self && <span className="text-[9px] font-semibold">SELF</span>}
                        {!m.is_self && side && (
                          <span className="text-[9px] text-muted-foreground border-l border-current/20 pl-0.5">{side}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-4">No team assigned for this date.</p>
              )}
            </div>

            {/* Services */}
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Briefcase className="w-3 h-3" /> Services
              </div>
              {svcs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {svcs.map(({ service: s, provider }) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-full border bg-muted text-foreground border-border px-2 py-0.5 text-xs font-medium"
                    >
                      {s.name}
                      {provider && <span className="text-[9px] text-muted-foreground ml-1">— {provider}</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-4">No services added for this date.</p>
              )}
            </div>

            {/* View Event */}
            <button
              onClick={() => handleViewEvent(ev)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/5 border border-primary/20 rounded-md py-1.5 transition-colors"
            >
              View Event <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}