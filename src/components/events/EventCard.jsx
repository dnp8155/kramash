import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, ArrowRight } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate } from "@/utils/format";

export default function EventCard({ event, clientName }) {
  const dateLabel = event.end_date
    ? `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`
    : formatDate(event.start_date);

  return (
    <Link to={`/events/${event.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardBody className="flex flex-1 flex-col gap-3">
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
        </CardBody>
      </Card>
    </Link>
  );
}