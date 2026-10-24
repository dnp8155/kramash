import { useNavigate } from "react-router-dom";
import { HardDrive, ChevronRight } from "lucide-react";
import { useT } from "@/hooks/useT";
import { overallUsage, biggestJobs, formatSize } from "@/lib/storageService";

// A coloured bar split into segments (widths are % of the whole bar); the rest stays empty.
export function SegmentBar({ segments, className = "h-2.5" }) {
  return (
    <div className={`flex gap-px overflow-hidden rounded-full bg-muted ${className}`} role="img">
      {segments.filter((s) => s.pct > 0).map((s) => (
        <div key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${Math.max(s.pct, 1)}%`, backgroundColor: s.color }} title={s.label} />
      ))}
    </div>
  );
}

// Top of the Storage page: how much is used across all drives (one bar, a colour per drive) and which jobs are biggest.
export default function StorageOverview({ drives, locations, eventsById, term }) {
  const t = useT();
  const navigate = useNavigate();
  const o = overallUsage(drives, locations);
  const jobs = biggestJobs(locations).map((j) => ({ ...j, event: eventsById[j.eventId] })).filter((j) => j.event);
  if (drives.length === 0 || (o.usedAll === 0 && !o.capacity)) return null;

  const whole = o.capacity || o.usedAll || 1;
  const segments = o.per.map((p) => ({ key: p.drive.id, color: p.drive.color || "#64748B", label: `${p.drive.name} · ${formatSize(p.used)}`, pct: (p.used / whole) * 100 }));
  const over = o.available != null && o.available < 0;
  const topGb = jobs[0]?.gb || 1;

  return (
    <section className="bg-card border border-border rounded-[15px] p-4 sm:p-5 space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <div className="text-sm font-semibold text-foreground">
            {o.capacity ? `${formatSize(o.used)} ${t("of")} ${formatSize(o.capacity)} ${t("used")}` : `${formatSize(o.usedAll)} ${t("used")}`}
          </div>
          {o.available != null && (
            <div className={`text-xs font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
              {over ? `${formatSize(-o.available)} ${t("over")}` : `${formatSize(o.available)} ${t("available")}`}
            </div>
          )}
        </div>
        <div className="mt-2.5"><SegmentBar segments={segments} className="h-3" /></div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {o.per.map((p) => (
            <li key={p.drive.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.drive.color || "#64748B" }} />
              <span className="text-foreground">{p.drive.name}</span> {formatSize(p.used)}
            </li>
          ))}
          {o.capacity && <li className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border border-border" />{t("Available")}</li>}
        </ul>
        {o.capacity && o.usedOnUnsized > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">{formatSize(o.usedOnUnsized)} {t("more is on drives with no total size, so it is not counted above.")}</p>
        )}
        {!o.capacity && <p className="mt-2 text-[11px] text-muted-foreground">{t("Add a total size to your drives to see how much is available.")}</p>}
      </div>

      {jobs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{t("Biggest")} {term.workItemPlural.toLowerCase()}</h3>
          <ul className="divide-y divide-border">
            {jobs.map((j) => (
              <li key={j.eventId}>
                <button onClick={() => navigate(`/events/${j.eventId}`)} className="w-full flex items-center gap-3 py-2.5 text-left">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><HardDrive className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-foreground truncate">{j.event.title}</span>
                      <span className="text-xs font-medium text-foreground shrink-0">{formatSize(j.gb)}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(j.gb / topGb) * 100}%` }} /></div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{j.copies} {j.copies === 1 ? t("copy") : t("copies")}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
