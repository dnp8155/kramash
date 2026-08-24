import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, MapPin, FileText, StickyNote, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { formatEventDate, isThisWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function EventsTable({ events, clients, loading, onEventClick, onEditEvent, onAdd, canAdd }) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg">
        <LoadingState label="Loading events…" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg">
        <EmptyState
          title="No events yet"
          description="Create your first event to get started."
          action={canAdd ? <Button onClick={onAdd}>+ Add Event</Button> : null}
        />
      </div>
    );
  }

  const clientName = (id) => clients[id]?.name || "—";

  const weekEvents = events.filter((e) => isThisWeek(e.start_date));
  const laterEvents = events.filter((e) => !isThisWeek(e.start_date));

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
            {weekEvents.length} Event{weekEvents.length > 1 ? "s" : ""} This Week
          </div>
          {weekEvents.map((e) => (
            <Row key={e.id} event={e} clientName={clientName(e.client_id)} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} />
          ))}
        </>
      )}

      {laterEvents.length > 0 && (
        <>
          <div className={cn("px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30", weekEvents.length > 0 && "border-t border-border")}>
            All Events
          </div>
          {laterEvents.map((e) => (
            <Row key={e.id} event={e} clientName={clientName(e.client_id)} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({ event, clientName, onClick, onEdit }) {
  const [open, setOpen] = useState(false);
  const shortId = `#${event.id.slice(-4)}`;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="grid grid-cols-[auto_1fr] sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <span className="text-sm text-muted-foreground font-medium hidden sm:block">{shortId}</span>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", EVENT_STATUS[event.status]?.dot)} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
            <div className="text-xs text-muted-foreground sm:hidden">{event.event_type} · {formatEventDate(event.start_date, event.end_date)}</div>
            <div className="text-xs text-muted-foreground hidden sm:block">{clientName}</div>
          </div>
        </div>
        <span className="text-sm text-foreground hidden sm:block">{event.event_type}</span>
        <span className="text-sm text-muted-foreground hidden sm:block">{formatEventDate(event.start_date, event.end_date)}</span>
        <StatusBadge status={event.status} />
        <button
          className="text-muted-foreground hover:text-foreground justify-self-end"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:pl-[130px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Hide details <ChevronUp className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onClick}>
                View Details <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {event.venue && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{event.venue}{event.venue_address ? ` · ${event.venue_address}` : ""}</span>
              </div>
            )}
            {event.description && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{event.description}</span>
              </div>
            )}
            {event.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{event.notes}</span>
              </div>
            )}
            {!event.venue && !event.description && !event.notes && (
              <p className="text-xs text-muted-foreground">No additional details. Click "View Details" for the full event page.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}