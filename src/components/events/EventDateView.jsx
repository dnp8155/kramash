import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, LayoutGrid, CalendarDays, Pencil, MapPin, Plus, NotebookPen, Settings2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { isAssignedToDate, todayISO } from "@/lib/dates";
import { daySchedServices, effectiveDayTitle } from "@/lib/daySchedule";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import MemberTypeTag from "@/components/common/MemberTypeTag";
import PaymentDot from "@/components/common/PaymentDot";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";

const VIEW_KEY = "kramasha_event_view";

// "By member" (the cards) or "By date" for the Team and Services tabs. One choice for both, remembered on this device.
export function useEventViewMode() {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === "date" ? "date" : "member"; } catch { return "member"; }
  });
  const setMode = useCallback((m) => {
    setModeState(m);
    try { localStorage.setItem(VIEW_KEY, m); } catch { /* ignore */ }
  }, []);
  return [mode, setMode];
}

export function EventViewToggle({ value, onChange }) {
  const t = useT();
  return (
    <SegmentedTabs
      size="sm"
      layoutId="event-view-toggle"
      items={[{ value: "member", icon: LayoutGrid, title: t("Cards") }, { value: "date", icon: CalendarDays, title: t("By date") }]}
      value={value}
      onChange={onChange}
    />
  );
}

const DAY_STATUS = [
  { key: "planned", label: "Planned", cls: "bg-muted text-foreground border-border" },
  { key: "confirmed", label: "Confirmed", cls: "bg-primary/10 text-primary border-primary/30" },
  { key: "done", label: "Done", cls: "bg-success/10 text-success border-success/30" },
  { key: "cancelled", label: "Cancelled", cls: "bg-destructive/10 text-destructive border-destructive/30" },
];

function fmtDate(d) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  } catch { return d; }
}

// A small text box that edits in place: Enter or leaving the box saves, Escape cancels.
function InlineField({ value, placeholder, onSave, onCancel, className }) {
  const [draft, setDraft] = useState(value);
  const done = useRef(false);
  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    save ? onSave(draft.trim()) : onCancel();
  };
  return (
    <input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        if (e.key === "Escape") finish(false);
      }}
      className={cn("h-8 min-w-0 rounded-lg border border-primary/40 bg-card px-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40", className)}
    />
  );
}

// Each date of the event as an always-open card: the date, its title and venue, who is working that day (kind="team")
// or which services run that day (kind="services"), then the day's status and notes along the bottom.
// Everything saves as you go. Tapping a person or service opens the same edit sheet the card view uses.
export default function EventDateView({
  kind, event, dates, workspaceId,
  eventAssignments = [], allAssignments = [], eventsById = {}, membersById = {},
  serviceAssignments = [], services = [], dayAssignments = [],
  quoteTitles = {}, jobSheet = null,
  transactions = [], contractValue = null,
  onChanged,
  onEditMember, onEditService,
}) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = todayISO();
  const days = dates.slice().sort();
  const activeTeam = eventAssignments.filter((a) => a.assignment_status !== "removed");
  // The page loads every day record in the workspace; only this event's belong here.
  const myDays = dayAssignments.filter((x) => x.event_id === event.id);
  // What was just saved, shown straight away while the page reloads behind it.
  const [local, setLocal] = useState({});
  const dayOf = (d) => ({ ...(myDays.find((x) => x.date === d) || {}), ...(local[d] || {}) });

  // The job sheet keeps its own venue per date, and on the printed sheet it wins over the day plan's. Show it here and,
  // when the venue is changed, change it there too so the two never disagree.
  const parseDc = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {}); } catch { return {}; } };
  const jobDc = useRef(parseDc(jobSheet?.date_configs));
  const lastJobSheet = useRef(jobSheet);
  if (lastJobSheet.current !== jobSheet) { lastJobSheet.current = jobSheet; jobDc.current = parseDc(jobSheet?.date_configs); }
  const [, bump] = useState(0);
  const venueOf = (d) => ((jobDc.current[d]?.venue_override || "").trim() || (dayOf(d).venue_override || "").trim());

  const [editing, setEditing] = useState(null); // { date, field: "title" | "venue" }
  const [notesOpen, setNotesOpen] = useState(() => new Set(days.filter((d) => (myDays.find((x) => x.date === d)?.notes || "").trim())));

  // One save at a time per date, and a date's first save creates its record that later saves then update.
  const queue = useRef({});
  const recordIds = useRef({});
  const save = (d, patch) => {
    const before = local[d];
    setLocal((p) => ({ ...p, [d]: { ...(p[d] || {}), ...patch } }));
    const run = async () => {
      const id = recordIds.current[d] || myDays.find((x) => x.date === d)?.id;
      if (id) {
        await base44.entities.EventDayAssignment.update(id, patch);
      } else {
        const created = await base44.entities.EventDayAssignment.create({ workspace_id: workspaceId, event_id: event.id, date: d, ...patch });
        recordIds.current[d] = created?.id;
      }
    };
    queue.current[d] = (queue.current[d] || Promise.resolve()).then(run).then(
      () => onChanged?.(),
      (e) => {
        setLocal((p) => ({ ...p, [d]: before }));
        toast({ title: t("Could not save"), description: e?.message, variant: "destructive" });
      },
    );
  };

  const saveTitle = (d, text) => {
    setEditing(null);
    // Matching the quotation's title means "follow the quotation", so nothing is stored.
    const value = text === (quoteTitles[d] || "") ? "" : text;
    if (value !== (dayOf(d).title || "")) save(d, { title: value });
  };
  const saveVenue = (d, text) => {
    setEditing(null);
    if (text === venueOf(d)) return;
    save(d, { venue_override: text });
    if (jobSheet?.id && (jobDc.current[d]?.venue_override || "").trim()) {
      const next = { ...jobDc.current, [d]: { ...jobDc.current[d], venue_override: text } };
      const previous = jobDc.current;
      jobDc.current = next;
      bump((n) => n + 1);
      base44.entities.JobSheet.update(jobSheet.id, { date_configs: next }).then(
        () => queryClient.invalidateQueries({ queryKey: ["jobSheet"] }),
        (e) => {
          jobDc.current = previous;
          bump((n) => n + 1);
          toast({ title: t("Could not update the job sheet venue"), description: e?.message, variant: "destructive" });
        },
      );
    }
  };

  // The same payment dot the cards show before a name (red pending, orange partial, green paid, blue overpaid). It carries the
  // "status-dot" class, so Preferences → Show status dots hides it here too.
  const clientPaid = transactions
    .filter((tx) => tx.transaction_type === "CLIENT_RECEIPT" && tx.status === "ACTIVE" && tx.event_id === event.id)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const clientTotal = contractValue != null ? contractValue : (Number(event.contract_value) || 0);
  const teamDot = (a) => {
    if (membersById[a.team_member_id]?.is_self) return <PaymentDot paid={clientPaid} agreed={clientTotal} />;
    const paid = transactions.filter((tx) => tx.team_assignment_id === a.id && tx.status === "ACTIVE").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return <PaymentDot paid={paid} agreed={Number(a.agreed_rate) || 0} />;
  };

  // Same person already booked on another event that day.
  const clashFor = (a, d) => {
    const other = allAssignments.find((x) =>
      x.id !== a.id && x.team_member_id === a.team_member_id && x.event_id !== event.id &&
      x.assignment_status !== "removed" && isAssignedToDate(x, d, eventsById[x.event_id]));
    return other ? (eventsById[other.event_id]?.title || t("another event")) : null;
  };

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const isToday = d === today;
        const isPast = d < today;
        const rec = dayOf(d);
        const status = rec.status || "planned";
        const title = effectiveDayTitle(rec, quoteTitles, d);
        const venue = venueOf(d);
        const teamCount = activeTeam.filter((a) => isAssignedToDate(a, d, event)).length;
        const dayServices = daySchedServices(serviceAssignments, services, rec.service_ids);
        const serviceCount = dayServices.shown.length;
        const editingTitle = editing?.date === d && editing.field === "title";
        const editingVenue = editing?.date === d && editing.field === "venue";
        const showNotes = notesOpen.has(d);

        let rows = [];
        if (kind === "team") {
          rows = activeTeam.filter((a) => isAssignedToDate(a, d, event)).map((a) => {
            const m = membersById[a.team_member_id];
            const clash = clashFor(a, d);
            return (
              <button key={a.id} type="button" onClick={() => onEditMember?.(a)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">{teamDot(a)}<span className="text-sm font-medium text-foreground truncate">{m?.name || t("Unknown member")}</span></span>
                  {clash && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {t("Also on")} {clash}
                    </span>
                  )}
                </span>
                <MemberTypeTag label={a.role_name_snapshot || a.member_type_snapshot || m?.profession} typeId={a.member_type_id} />
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          });
        } else {
          rows = dayServices.shown.map((s) => {
            const asg = serviceAssignments.find((a) => a.service_id === s.id && a.assignment_status !== "removed");
            return (
              <button key={s.id} type="button" onClick={() => asg && onEditService?.(asg)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">{asg && <PaymentDot paid={transactions.filter((tx) => tx.service_assignment_id === asg.id && tx.transaction_type === "BUSINESS_EXPENSE" && tx.status === "ACTIVE").reduce((sum, tx) => sum + Number(tx.amount || 0), 0)} agreed={Number(asg.agreed_rate) || 0} />}<span className="text-sm font-medium text-foreground truncate">{s.name}</span></span>
                  {s.provider && <span className="block text-xs text-muted-foreground truncate">{s.provider}</span>}
                </span>
                {s.isAddon && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t("Add-on")}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          });
      }

        const pickService = (id, checked) => {
          const current = dayServices.shown.map((x) => x.id);
          const next = checked ? [...current, id] : current.filter((x) => x !== id);
          // Everything selected (or nothing left) = follow the event again.
          save(d, { service_ids: next.length === dayServices.all.length || next.length === 0 ? [] : next });
        };

        return (
          <div key={d} className={cn("rounded-[15px] border bg-card overflow-hidden", isToday ? "border-primary/40" : "border-border", isPast && status === "done" && "opacity-80")}>
            <div className={cn("px-4 py-2.5 border-b border-border", isToday ? "bg-primary/5" : "bg-muted/40")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-h-8">
                <span className="text-sm font-semibold text-foreground">{fmtDate(d)}</span>
                {editingTitle ? (
                  <InlineField
                    value={title}
                    placeholder={quoteTitles[d] || t("e.g. Haldi, Wedding, Reception")}
                    onSave={(v) => saveTitle(d, v)}
                    onCancel={() => setEditing(null)}
                    className="flex-1 basis-40"
                  />
                ) : (
                  <>
                    {title && <span className="text-sm text-foreground min-w-0 truncate">· {title}</span>}
                    <button type="button" onClick={() => setEditing({ date: d, field: "title" })} aria-label={title ? t("Edit title") : t("Add title")} title={title ? t("Edit title") : t("Add title")} className="inline-flex items-center gap-1 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                      <Pencil className="w-3.5 h-3.5" />
                      {!title && <span className="text-xs pr-1">{t("Add title")}</span>}
                    </button>
                  </>
                )}
                {editingVenue ? (
                  <InlineField
                    value={venue}
                    placeholder={event.venue || t("Venue for this day")}
                    onSave={(v) => saveVenue(d, v)}
                    onCancel={() => setEditing(null)}
                    className="flex-1 basis-40"
                  />
                ) : venue ? (
                  <button type="button" onClick={() => setEditing({ date: d, field: "venue" })} title={t("Edit venue")} className="inline-flex items-center gap-1 max-w-full rounded-full border border-border bg-card px-2 py-0.5 text-xs text-foreground hover:bg-muted">
                    <MapPin className="w-3 h-3 text-primary shrink-0" /><span className="truncate">{venue}</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => setEditing({ date: d, field: "venue" })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                    <Plus className="w-3 h-3" /> {t("Venue")}
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {isToday ? `${t("Today")} · ` : ""}
                {kind === "team"
                  ? `${teamCount} ${t(teamCount === 1 ? "member" : "members")}`
                  : `${serviceCount} ${t(serviceCount === 1 ? "service" : "services")}`}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">{kind === "team" ? t("No team assigned for this day.") : t("No services for this day.")}</p>
            ) : (
              <div className="divide-y divide-border">{rows}</div>
            )}

            {kind === "services" && dayServices.all.length > 0 && (
              <div className="px-4 pb-2.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Settings2 className="w-3 h-3" /> {t("Manage services for this day")}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-1" align="start">
                    <div className="max-h-60 overflow-y-auto">
                      {dayServices.isCustom && (
                        <button type="button" onClick={() => save(d, { service_ids: [] })} className="w-full px-2 py-1.5 mb-1 rounded-md text-left text-xs font-medium text-primary hover:bg-muted border-b border-border">
                          {t("Use all event services")}
                        </button>
                      )}
                      {dayServices.all.map((opt) => {
                        const checked = dayServices.shown.some((x) => x.id === opt.id);
                        return (
                          <button key={opt.id} type="button" onClick={() => pickService(opt.id, !checked)} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-left">
                            <span className={cn("mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0", checked ? "bg-primary border-primary" : "border-border")}>
                              {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-medium text-foreground truncate">{opt.name}{opt.isAddon ? ` · ${t("Add-on")}` : ""}</span>
                              {opt.provider && <span className="block text-[10px] text-muted-foreground truncate">{opt.provider}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className={cn("px-4 py-2.5 space-y-2.5", "border-t border-dashed border-border")}>
              <div className="flex flex-wrap items-center gap-1.5">
                {DAY_STATUS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => status !== s.key && save(d, { status: s.key })}
                    aria-pressed={status === s.key}
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                      status === s.key ? s.cls : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {status === s.key && <Check className="w-3 h-3 inline mr-1" />}
                    {t(s.label)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNotesOpen((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; })}
                  aria-expanded={showNotes}
                  className={cn("ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-dashed transition-colors", showNotes || (rec.notes || "").trim() ? "text-primary border-primary/40 bg-primary/5" : "text-muted-foreground border-border hover:text-foreground")}
                >
                  <NotebookPen className="w-3 h-3" /> {t("Notes")}
                </button>
              </div>
              {showNotes && (
                <Textarea
                  key={d}
                  defaultValue={rec.notes || ""}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (rec.notes || "").trim()) save(d, { notes: v }); }}
                  placeholder={t("What's happening this day?")}
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
