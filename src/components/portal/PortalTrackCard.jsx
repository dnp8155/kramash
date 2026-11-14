import { PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { formatCount } from "@/utils/format";
import { trackStatuses, statusOf, TRACK_DONE } from "@/lib/trackStatuses";

// What is being made for the client ("2 × Albums") and where each item stands (read-only). Shown on the tracking page
// and, when the owner switches Track sharing on, inside the client portals. `labels` are the business's own names for
// the last two statuses. Same card look as the other portal sections.
export function TrackRows({ items, labels }) {
  const statuses = trackStatuses(labels);
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => {
        const meta = statusOf(statuses, it.status);
        const q = Number(it.quantity) || 1;
        return (
          <li key={it.id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground break-anywhere">
                {q > 1 && <span className="text-muted-foreground whitespace-nowrap">{formatCount(q)} × </span>}{it.title}
              </div>
              {it.note && <div className="text-xs text-muted-foreground mt-0.5 break-anywhere">{it.note}</div>}
              {it.expected_date && it.status !== TRACK_DONE && (
                <div className="text-xs text-muted-foreground mt-0.5">Expected by {formatDate(it.expected_date)}</div>
              )}
            </div>
            <span className={cn("shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", meta.cls)}><meta.Icon className="w-3 h-3 shrink-0" />{meta.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PortalTrackCard({ items, labels, title = "Progress" }) {
  if (!items || items.length === 0) return null;
  const done = items.filter((i) => i.status === TRACK_DONE).length;
  const doneLabel = statusOf(trackStatuses(labels), TRACK_DONE).label.toLowerCase();
  return (
    <div className="bg-card border border-border rounded-[15px] p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <PackageCheck className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({done}/{items.length} {doneLabel})</span>
      </div>
      <TrackRows items={items} labels={labels} />
    </div>
  );
}
