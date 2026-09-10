import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, ArrowRight, ChevronDown } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate } from "@/utils/format";

// Event card with expandable team member preview. The main card body links
// to the event detail page. A separate expand button toggles a team member
// list showing each member's role and assigned working dates.
export default function EventCard({ event, clientName, assignments = [], members = [] }) {
  const [expanded, setExpanded] = useState(false);
  const dateLabel = event.end_date
    ? `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`
    : formatDate(event.start_date);

  const eventAssignments = assignments.filter(
    (a) => a.event_id === event.id && a.assignment_status === "Assigned"
  );

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardBody className="flex flex-1 flex-col gap-3">
        <Link to={`/events/${event.id}`} className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {event.event_type}
              </p>
              <h3 className="truncate text-base font-semibold text-foreground">
                {event.title}
              </h3>
            </div>
            <StatusBadge status={event.status} />
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {dateLabel}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {event.venue || "—"}
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {clientName || "—"}
            </p>
          </div>
          <div className="mt-auto flex items-center justify-end border-t border-border pt-3 text-sm font-medium text-primary">
            View Details <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {eventAssignments.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between border-t border-border pt-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Team Members ({eventAssignments.length})</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
        {expanded && eventAssignments.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {eventAssignments.map((a) => {
              const member = members.find((m) => m.id === a.team_member_id);
              const dates = (a.working_dates || []).map(formatDate).join(", ");
              return (
                <div key={a.id} className="text-xs">
                  <span className="font-medium text-foreground">
                    {member?.name || "Unknown"}
                  </span>
                  <span className="text-muted-foreground">
                    {" — "}{a.role_name_snapshot || "—"}
                    {dates && ` — ${dates}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}