import { useState, useMemo } from "react";
import { ChevronDown, Check, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { isAssignedToDate, todayISO } from "@/lib/dates";
import DayScheduleCard from "@/components/events/DayScheduleCard";
import { daySchedServices } from "@/lib/daySchedule";
import { useT } from "@/hooks/useT";

function fmtDate(d) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  } catch { return d; }
}

// One compact row per day: date, a one-line summary, and a one-tap "Done" toggle.
// Tapping the row opens the full day plan (team, services, notes). Today opens by default.
export default function DayScheduleList({ event, dates, workspaceId, eventAssignments, dayAssignments, onChanged, ...cardProps }) {
  const t = useT();
  const today = todayISO();
  const [open, setOpen] = useState(() => new Set(dates.includes(today) ? [today] : []));
  const [busy, setBusy] = useState(null);

  const byDate = useMemo(() => {
    const m = {};
    dayAssignments.forEach((a) => { m[a.date] = a; });
    return m;
  }, [dayAssignments]);

  const toggleOpen = (d) => setOpen((prev) => {
    const next = new Set(prev);
    next.has(d) ? next.delete(d) : next.add(d);
    return next;
  });

  const toggleDone = async (d) => {
    const rec = byDate[d];
    const status = rec?.status === "done" ? "planned" : "done";
    setBusy(d);
    try {
      if (rec?.id) await base44.entities.EventDayAssignment.update(rec.id, { status });
      else await base44.entities.EventDayAssignment.create({ workspace_id: workspaceId, event_id: event.id, date: d, status });
      onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="divide-y divide-border rounded-[15px] border border-border bg-card overflow-hidden">
      {dates.map((d) => {
        const rec = byDate[d];
        const isDone = rec?.status === "done";
        const isToday = d === today;
        const isPast = d < today;
        const teamCount = eventAssignments.filter((a) => isAssignedToDate(a, d, event)).length;
        const serviceCount = daySchedServices(cardProps.serviceAssignments, cardProps.services, rec?.service_ids).shown.length;
        const expanded = open.has(d);
        return (
          <div key={d} className={cn(isToday && "bg-primary/5")}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => toggleOpen(d)} className="flex-1 min-w-0 flex items-center gap-3 text-left" aria-expanded={expanded}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", isPast && !isDone ? "text-muted-foreground" : "text-foreground")}>{fmtDate(d)}</span>
                    {isToday && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{t("Today")}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {teamCount === 0 ? (
                      <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> {t("No team yet")}</span>
                    ) : (
                      <span>{teamCount} {t("team")}</span>
                    )}
                    <span>·</span>
                    <span>{serviceCount} {serviceCount === 1 ? t("service") : t("services")}</span>
                  </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground ml-auto shrink-0 transition-transform", expanded && "rotate-180")} />
              </button>
              <button
                type="button"
                onClick={() => toggleDone(d)}
                disabled={busy === d}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                  isDone ? "bg-success/10 text-success border-success/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                <Check className="w-3.5 h-3.5" /> {isDone ? t("Done") : t("Mark done")}
              </button>
            </div>
            {expanded && (
              <div className="px-3 pb-3">
                <DayScheduleCard
                  event={event}
                  date={d}
                  workspaceId={workspaceId}
                  eventAssignments={eventAssignments}
                  dayAssignments={dayAssignments}
                  onChanged={onChanged}
                  {...cardProps}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
