import { useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useT } from "@/hooks/useT";
import { todayISO, parseISODate } from "@/lib/dates";

const SHOWN = 3;
const daysAgo = (iso) => Math.max(0, Math.round((parseISODate(todayISO()) - parseISODate(String(iso).slice(0, 10))) / 86400000));

// "Follow-ups due": open leads whose follow-up date is today or already past. Tap one to open it.
export default function LeadFollowUpStrip({ overdue, today, onOpen }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const rows = [...overdue, ...today];
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, SHOWN);

  return (
    <div className="bg-card border border-border rounded-[15px] shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <CalendarClock className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold text-foreground">{t("Follow-ups due")}</h3>
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-warning/15 text-warning text-[11px] font-semibold inline-flex items-center justify-center">{rows.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {shown.map((l) => {
          const late = daysAgo(l.next_followup_date);
          return (
            <li key={l.id}>
              <button type="button" onClick={() => onOpen(l)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{l.name}</div>
                  {l.event_type && <div className="text-xs text-muted-foreground truncate">{l.event_type}</div>}
                </div>
                <span className={late > 0 ? "text-xs font-medium text-warning whitespace-nowrap" : "text-xs font-medium text-primary whitespace-nowrap"}>
                  {late > 0 ? `${t("Overdue")} · ${late}${t("d")}` : t("Today")}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length > SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)} className="w-full px-4 py-2 text-xs font-medium text-primary hover:bg-muted/50 border-t border-border">
          {all ? t("Show less") : `${t("Show all")} (${rows.length})`}
        </button>
      )}
    </div>
  );
}
