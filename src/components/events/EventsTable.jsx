import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { formatEventDate, isThisWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";

const financeCards = [
  { key: "contract", label: "Contract" },
  { key: "received", label: "RCVD" },
  { key: "paid", label: "PAID" },
  { key: "left", label: "LEFT" },
  { key: "profit", label: "PROFIT" }
];

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
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          </div>

          {/* Finance cards — placeholder until Phase 5 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {financeCards.map((c) => (
              <div key={c.key} className="bg-muted/40 border border-border rounded-md px-3 py-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</div>
                <div className="text-sm font-semibold mt-0.5 text-muted-foreground">—</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Financial tracking available in Phase 5.</p>

          {/* Team members — placeholder until Phase 4 */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team Members</div>
            <div className="text-sm text-muted-foreground">No team assigned yet. Team management arrives in Phase 4.</div>
          </div>
        </div>
      )}
    </div>
  );
}