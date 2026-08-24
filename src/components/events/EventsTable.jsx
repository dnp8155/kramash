import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { events } from "@/data/mockEvents";
import { formatINR } from "@/utils/format";
import { cn } from "@/lib/utils";

const financeCards = [
  { key: "contract", label: "Contract", tone: "text-foreground" },
  { key: "received", label: "RCVD", tone: "text-success" },
  { key: "paid", label: "PAID", tone: "text-destructive" },
  { key: "left", label: "LEFT", tone: "text-[#a67c00]" },
  { key: "profit", label: "PROFIT", tone: "text-success" }
];

export default function EventsTable({ query }) {
  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.type.toLowerCase().includes(query.toLowerCase())
  );

  const weekEvents = filtered.filter((e) => e.week);
  const laterEvents = filtered.filter((e) => !e.week);

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
            All Events
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

function Row({ event }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="grid grid-cols-[auto_1fr] sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
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
        <button
          className="text-muted-foreground hover:text-foreground justify-self-end"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:pl-[130px] animate-fade-in">
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
          >
            Hide Financials <ChevronUp className="w-3 h-3" />
          </button>

          {/* Finance cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {financeCards.map((c) => (
              <div key={c.key} className="bg-muted/40 border border-border rounded-md px-3 py-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</div>
                <div className={cn("text-sm font-semibold mt-0.5", c.tone)}>{formatINR(event[c.key])}</div>
              </div>
            ))}
          </div>

          {/* Team members */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team Members</div>
            <div className="space-y-1.5">
              {event.team.length === 0 && (
                <div className="text-sm text-muted-foreground">No team assigned.</div>
              )}
              {event.team.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={cn("w-1.5 h-1.5 rounded-full", m.name === "UNASSIGNED" ? "bg-muted-foreground/40" : "bg-success")} />
                  <span className={cn("font-medium", m.name === "UNASSIGNED" ? "text-muted-foreground" : "text-foreground")}>
                    {m.name}
                  </span>
                  {m.role && <span className="text-muted-foreground">· {m.role}</span>}
                  {m.date && <span className="text-muted-foreground">· {m.date}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}