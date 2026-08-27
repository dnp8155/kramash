import { Link } from "react-router-dom";
import { formatMoney } from "@/utils/format";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { CalendarDays, MapPin, ArrowRight, Plus } from "lucide-react";

export default function UpcomingEventsWidget({ events = [], clientsById = {}, currency = "INR", isLoading, onEventClick, onSeeAll, workItemLabel = "Events" }) {
  const list = events.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upcoming {workItemLabel}</h3>
        </div>
        <button onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={`No upcoming ${workItemLabel.toLowerCase()}`}
            description="Schedule your next booking to see it here."
            action={
              <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add {workItemLabel.toLowerCase().replace(/s$/, "")}
              </Link>
            }
          />
        ) : (
          <div className="space-y-1">
            {list.map((ev) => {
              const client = clientsById[ev.client_id];
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="w-full text-left flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-primary/5 rounded-md py-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {new Date(ev.start_date + "T12:00:00").toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold text-primary leading-none">
                      {new Date(ev.start_date + "T12:00:00").getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      {client && <span className="truncate">{client.name}</span>}
                      {client && ev.venue && <span>·</span>}
                      {ev.venue && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {ev.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={ev.status} />
                    {Number(ev.contract_value) > 0 && (
                      <span className="text-xs font-medium text-muted-foreground">{formatMoney(ev.contract_value, currency)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}