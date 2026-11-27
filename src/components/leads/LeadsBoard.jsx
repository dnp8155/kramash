import { useState } from "react";
import { formatMoney } from "@/utils/format";
import { LEAD_STATUSES, STATUS_STYLES, PRIORITY_STYLES } from "@/constants/leadConfig";
import { isOpenLead } from "@/lib/leadManager";
import { isPastDate, formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

// Desktop pipeline: one column per status. Drag a lead to another column to change its status.
export default function LeadsBoard({ leads, currency, onMove, onOpen }) {
  const t = useT();
  const [overCol, setOverCol] = useState(null);
  const [dragId, setDragId] = useState(null);

  const drop = (status) => {
    const lead = leads.find((l) => l.id === dragId);
    setOverCol(null);
    setDragId(null);
    if (lead && lead.status !== status) onMove(lead, status);
  };

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {LEAD_STATUSES.map((status) => {
        const st = STATUS_STYLES[status];
        const col = leads.filter((l) => l.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); if (overCol !== status) setOverCol(status); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null); }}
            onDrop={(e) => { e.preventDefault(); drop(status); }}
            className={cn("rounded-[15px] border bg-muted/30 p-2.5 min-h-[220px] transition-colors", overCol === status ? "border-primary bg-primary/5" : "border-border")}
          >
            <div className="flex items-center justify-between px-1.5 pb-2.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>{t(st.label)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((l) => {
                const pr = PRIORITY_STYLES[l.priority] || PRIORITY_STYLES.warm;
                const PrIcon = pr.icon;
                const due = isOpenLead(l) && l.next_followup_date && isPastDate(l.next_followup_date);
                return (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => { setDragId(l.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", l.id); }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => onOpen(l)}
                    className={cn("bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors", dragId === l.id && "opacity-50")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground truncate">{l.name}</div>
                      <PrIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${pr.color}`} />
                    </div>
                    {l.event_type && <div className="text-xs text-muted-foreground truncate mt-0.5">{l.event_type}</div>}
                    {l.budget > 0 && <div className="text-xs font-medium text-foreground mt-1.5">{formatMoney(l.budget, currency)}</div>}
                    {isOpenLead(l) && l.next_followup_date && (
                      <div className={cn("flex items-center gap-1 text-[11px] mt-1.5", due ? "text-warning font-medium" : "text-muted-foreground")}>
                        <CalendarClock className="w-3 h-3" /> {formatDate(l.next_followup_date)}
                      </div>
                    )}
                  </div>
                );
              })}
              {col.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">{t("Drop leads here")}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
