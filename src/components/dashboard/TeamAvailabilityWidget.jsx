import EmptyState from "@/components/common/EmptyState";
import { UserCheck, ArrowRight, Ban } from "lucide-react";

export default function TeamAvailabilityWidget({ avail = {}, isLoading, onSeeAll }) {
  const { available = [], booked = [], blocked = [] } = avail;

  return (
    <div className="bg-card border border-border rounded-lg h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Today</h3>
        </div>
        <button onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          Team <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (available.length + booked.length + blocked.length) === 0 ? (
          <EmptyState title="No active team" description="Add team members to track availability." />
        ) : (
          <>
            <AvailRow label="Available" count={available.length} tone="success" members={available} />
            <AvailRow label="Booked" count={booked.length} tone="primary" members={booked.map((b) => b.member)} />
            <AvailRow label="On leave" count={blocked.length} tone="muted" members={blocked.map((b) => b.member)} icon={Ban} />
          </>
        )}
      </div>
    </div>
  );
}

function AvailRow({ label, count, tone, members = [], icon: Icon }) {
  const dot = {
    success: "bg-success",
    primary: "bg-primary",
    muted: "bg-muted-foreground"
  }[tone];

  const text = {
    success: "text-success",
    primary: "text-primary",
    muted: "text-muted-foreground"
  }[tone];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${text}`}>{count}</span>
      </div>
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.slice(0, 8).map((m) => (
            <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[120px]">
              {m.name}
            </span>
          ))}
          {members.length > 8 && (
            <span className="text-xs px-2 py-0.5 text-muted-foreground">+{members.length - 8}</span>
          )}
        </div>
      )}
    </div>
  );
}