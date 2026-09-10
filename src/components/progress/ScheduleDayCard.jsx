import { formatDate } from "@/utils/format";
import { getEventsForDate, getTeamForDate, getServicesForDate } from "@/utils/progress";
import { getSideConfig } from "@/utils/sideConfig";
import SelfBadge from "@/components/common/SelfBadge";
import { isSelfMember } from "@/utils/selfDetection";

// One day in the schedule list. Shows the date, event name(s), and the team
// members + services actually assigned to that specific date (not the full
// event roster). Team chips include role and side badge. Service chips
// include provider name.
export default function ScheduleDayCard({
  date,
  events,
  assignments,
  serviceAssignments,
  members,
  ownerName,
}) {
  const dayEvents = getEventsForDate(events, date);
  const team = getTeamForDate(assignments, date);
  const services = getServicesForDate(serviceAssignments, events, date);

  if (dayEvents.length === 0 && team.length === 0 && services.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-foreground">{formatDate(date)}</p>
      {dayEvents.map((event) => (
        <p key={event.id} className="mt-0.5 text-xs text-primary">
          {event.title}
        </p>
      ))}

      {team.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">
            Team for this day
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {team.map((a) => {
              const member = members.find((m) => m.id === a.team_member_id);
              const isSelf = member && isSelfMember(member.name, ownerName);
              const side = getSideConfig(a.category_type);
              return (
                <span
                  key={a.id}
                  className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                >
                  <span className="font-medium text-foreground">
                    {member?.name || "Unknown"}
                  </span>
                  {isSelf && <SelfBadge />}
                  {a.role_name_snapshot && (
                    <span className="text-muted-foreground">· {a.role_name_snapshot}</span>
                  )}
                  {a.category_type && (
                    <span
                      className={`inline-flex rounded-full border px-1.5 py-0 text-[9px] ${side.badge}`}
                    >
                      {side.label}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">
            Services for this day
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {services.map((sa) => (
              <span
                key={sa.id}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
              >
                <span className="font-medium text-foreground">
                  {sa.service_name_snapshot || "—"}
                </span>
                {sa.provider_name_snapshot && (
                  <span className="text-muted-foreground">
                    · {sa.provider_name_snapshot}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}