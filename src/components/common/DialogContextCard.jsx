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

export default function DialogContextCard({ event, clientsById = {}, className, compact = false }) {
  if (!event) return null;
  const client = event.client_id ? clientsById[event.client_id] : null;
  const dates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);
  const venue = event.venue;

  // Compact: the project on the first line (client beside it), dates and venue together on the second.
  if (compact) {
    return (
      <div className={cn("rounded-lg bg-muted/40 border border-border px-3 py-2.5 min-w-0", className)}>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{event.title}</span>
          {client?.name && <span className="text-xs text-muted-foreground truncate shrink-[2]">{client.name}</span>}
        </div>
        {(dates.length > 0 || venue) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground min-w-0">
            {dates.length > 0 && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="text-foreground">{formatEventDates(event)}</span>
              </span>
            )}
            {venue && (
              <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate text-foreground">{venue}</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

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
