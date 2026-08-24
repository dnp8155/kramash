import { ChevronRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { events } from "@/data/mockEvents";
import { cn } from "@/lib/utils";

export default function EventsTable({ query }) {
  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.type.toLowerCase().includes(query.toLowerCase())
  );

  const weekEvents = filtered.filter((e) => e.week);
  const laterEvents = filtered.filter((e) => !e.week);

  const Row = ({ event }) => (
    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors">
      <span className="text-sm text-muted-foreground font-medium hidden sm:block">{event.id}</span>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", EVENT_STATUS[event.status].dot)} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{event.name}</div>
          <div className="text-xs text-muted-foreground sm:hidden">{event.type} · {event.date}</div>
        </div>
      </div>
      <span className="text-sm text-foreground hidden sm:block">{event.type}</span>
      <span className="text-sm text-muted-foreground hidden sm:block">{event.date}</span>
      <StatusBadge status={event.status} />
      <button className="text-muted-foreground hover:text-foreground justify-self-end" aria-label="More">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="hidden sm:grid grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>ID</span>
        <span>Name</span>
        <span>Type</span>
        <span>Date(s)</span>
        <span>Status</span>
        <span />
      </div>

      {weekEvents.length > 0 && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
            {weekEvents.length} Events This Week
          </div>
          {weekEvents.map((e) => <Row key={e.id} event={e} />)}
        </>
      )}

      {laterEvents.length > 0 && (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 border-t border-border">
            Upcoming
          </div>
          {laterEvents.map((e) => <Row key={e.id} event={e} />)}
        </>
      )}

      {filtered.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">No events found.</div>
      )}
    </div>
  );
}