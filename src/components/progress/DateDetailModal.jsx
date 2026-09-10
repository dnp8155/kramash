import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { formatDate } from "@/utils/format";
import { getTeamForDate, getServicesForDate } from "@/utils/progress";
import { getSideConfig } from "@/utils/sideConfig";
import SelfBadge from "@/components/common/SelfBadge";
import { isSelfMember } from "@/utils/selfDetection";

// Detail panel shown when a calendar date is clicked. Lists all events on
// that date, each with its team and services for that specific date, plus a
// View Event button that navigates to the existing Event Details page.
export default function DateDetailModal({
  date,
  events,
  assignments,
  serviceAssignments,
  members,
  ownerName,
  onClose,
}) {
  if (!date) return null;
  const dayEvents = events.filter((e) => {
    if (!e.start_date || e.status === "Cancelled") return false;
    const start = e.start_date;
    const end = e.end_date || e.start_date;
    return date >= start && date <= end;
  });

  return (
    <Modal open={!!date} onClose={onClose} title={formatDate(date)} size="md">
      <div className="flex flex-col gap-4">
        {dayEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No events on this date.
          </p>
        ) : (
          dayEvents.map((event) => {
            const team = getTeamForDate(assignments, date).filter(
              (a) => a.event_id === event.id
            );
            const services = getServicesForDate(serviceAssignments, events, date).filter(
              (sa) => sa.event_id === event.id
            );
            return (
              <div key={event.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.event_type}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(event.start_date)}
                  {event.end_date ? ` → ${formatDate(event.end_date)}` : ""}
                </p>

                {team.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">Team</p>
                    <ul className="mt-1 space-y-1">
                      {team.map((a) => {
                        const member = members.find((m) => m.id === a.team_member_id);
                        const isSelf = member && isSelfMember(member.name, ownerName);
                        const side = getSideConfig(a.category_type);
                        return (
                          <li key={a.id} className="text-xs text-foreground">
                            {member?.name || "Unknown"}
                            {isSelf && <SelfBadge className="ml-1" />}
                            {" — "}
                            {a.role_name_snapshot || "—"}
                            {a.category_type && (
                              <span
                                className={`ml-1.5 inline-flex rounded-full border px-1.5 py-0 text-[9px] ${side.badge}`}
                              >
                                {side.label}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">Services</p>
                    <ul className="mt-1 space-y-1">
                      {services.map((sa) => (
                        <li key={sa.id} className="text-xs text-foreground">
                          {sa.service_name_snapshot || "—"}
                          {sa.provider_name_snapshot && ` — ${sa.provider_name_snapshot}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link to={`/events/${event.id}`} className="mt-3 inline-block" onClick={onClose}>
                  <Button size="sm" variant="outline">
                    View Event <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}