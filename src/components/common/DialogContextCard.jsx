import { CalendarDays, User, MapPin, Briefcase } from "lucide-react";
import { formatEventDates } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// One aligned line: icon + fixed-width label, then the value, which wraps
// instead of being cut off (long project names and venues stay fully readable).
function Row({ icon: Icon, label, children }) {
  const t = useT();
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="flex items-center gap-2 w-[76px] shrink-0 h-6">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">{t(label)}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm text-foreground break-words leading-6">{children}</div>
    </div>
  );
}

export default function DialogContextCard({ event, clientsById = {}, className }) {
  if (!event) return null;
  const client = event.client_id ? clientsById[event.client_id] : null;
  const dates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);
  const venue = event.venue;

  return (
    <div className={cn("rounded-lg bg-muted/40 border border-border p-3 space-y-2", className)}>
      {client && <Row icon={User} label="Client">{client.name}</Row>}
      {event.title && <Row icon={Briefcase} label="Project">{event.title}</Row>}
      {dates.length > 0 && (
        <Row icon={CalendarDays} label="Dates">
          {formatEventDates(event)}
        </Row>
      )}
      {venue && <Row icon={MapPin} label="Venue">{venue}</Row>}
    </div>
  );
}
