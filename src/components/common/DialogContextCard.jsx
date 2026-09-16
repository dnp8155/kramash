import { CalendarDays, User, MapPin, Briefcase } from "lucide-react";
import { formatEventDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Compact context card shown at the top of event-scoped dialog bodies.
// Renders Client (if resolvable), Project/Event title, Dates, and Venue.
// Returns null when no event context is available.
function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground truncate">{value}</span>
    </div>
  );
}

export default function DialogContextCard({ event, clientsById = {}, className }) {
  if (!event) return null;
  const client = event.client_id ? clientsById[event.client_id] : null;
  const dates = formatEventDate(event.start_date, event.end_date);
  const venue = event.venue;

  return (
    <div className={cn("rounded-lg bg-muted/40 border border-border p-3 space-y-2", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {client && <Row icon={User} label="Client" value={client.name} />}
        <Row icon={Briefcase} label="Project" value={event.title} />
      </div>
      {(dates || venue) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2 border-t border-border/60">
          {dates && <Row icon={CalendarDays} label="Dates" value={dates} />}
          {venue && <Row icon={MapPin} label="Venue" value={venue} />}
        </div>
      )}
    </div>
  );
}