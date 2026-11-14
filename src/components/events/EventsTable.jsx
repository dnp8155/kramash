import React, { useState, useEffect, useRef } from "react";
import Collapse from "@/components/common/Collapse";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Pencil, MapPin, FileText, StickyNote, ArrowRight, Users, Briefcase, Trash2, Loader2, PackageCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoundIconButton from "@/components/common/RoundIconButton";
import StatusBadge from "@/components/common/StatusBadge";
import SettledBadge from "@/components/common/SettledBadge";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import EventsTableSkeleton from "@/components/events/EventsTableSkeleton";
import { formatEventDates, isToday, isTomorrow, isThisWeek, isThisMonth, nextEventDate, isOngoingEvent, formatAssignedDates, formatDateGroups } from "@/lib/dates";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { formatMoney } from "@/utils/format";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { assignmentPaid, serviceAssignmentPaid } from "@/lib/financeService";
import { base44 } from "@/api/base44Client";
import { currencyIcon } from "@/utils/currencyIcon";
import PaymentDot from "@/components/common/PaymentDot";import MemberTypeTag from "@/components/common/MemberTypeTag";
import EventTypeBadge from "@/components/common/EventTypeBadge";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// The Status column's track is dropped entirely (not just left blank) when the
// "Show event status" preference is off, so the other columns' `fr` tracks expand
// to take up the freed space instead of leaving a dead gap. Header and every row
// share this so their columns always stay aligned.
function getDesktopGridCols(prefs) {
  return prefs.showProgressIndicators
    ? "sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto]"
    : "sm:grid-cols-[110px_1.4fr_1fr_1.2fr_auto]";
}

// Groups team assignments by member type (side), preserving first-seen order —
// so the "show more" panel lists each type's tag once, followed by its members.
function groupByMemberType(assignments) {
  const groups = new Map();
  for (const a of assignments) {
    const key = a.member_type_snapshot || a.member_type_id || "__none";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  return Array.from(groups.entries());
}

// Splits events into mutually-exclusive date buckets (each event lands in exactly
// one), preserving relative order — powers the section headers in the list below.
function bucketEvents(events) {
  const ongoing = [];
  const today = [];
  const tomorrow = [];
  const week = [];
  const month = [];
  const upcoming = [];
  const rest = [];
  for (const e of events) {
    // Finished / completed / cancelled events never sit in a "coming up" section.
    const next = e.status === "completed" || e.status === "cancelled" ? null : nextEventDate(e);
    if (!next) rest.push(e);
    else if (isOngoingEvent(e)) ongoing.push(e);
    else if (isToday(next)) today.push(e);
    else if (isTomorrow(next)) tomorrow.push(e);
    else if (isThisWeek(next)) week.push(e);
    else if (isThisMonth(next)) month.push(e);
    else upcoming.push(e);
  }
  // Events arrive newest-first; the future sections read nearest-first instead
  // (ties by ID), while past events in `rest` stay newest-first.
  const nearestFirst = (a, b) => {
    const d = String(nextEventDate(a) || a.start_date || "").localeCompare(String(nextEventDate(b) || b.start_date || ""));
    return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
  };
  [ongoing, today, tomorrow, week, month, upcoming].forEach((list) => list.sort(nearestFirst));
  return { ongoing, today, tomorrow, week, month, upcoming, rest };
}

function DateChips({ event, maxChips = 3 }) {
  const t = useT();
  const dates = event?.event_dates;
  if (!Array.isArray(dates) || dates.length === 0) {
    return <span className="text-sm text-muted-foreground">{formatEventDates(event)}</span>;
  }
  const sorted = [...dates].sort();
  const groups = formatDateGroups(sorted);
  const visible = groups.slice(0, maxChips);
  const remaining = sorted.length - visible.reduce((sum, g) => sum + g.count, 0);
  return (
    <div>
      {visible.map((g, i) => (
        <React.Fragment key={g.label}>
          <span className="text-[13px] text-foreground whitespace-nowrap">
            {/* the year was dropped from earlier groups; if the group carrying it is cut off, put it on the last one shown */}
            {g.label}{i === visible.length - 1 && g.yearOmitted ? ` ${g.year}` : ""}{i < visible.length - 1 && <span className="text-muted-foreground">,</span>}
          </span>
          {/* plain text space so the gap matches the spaces inside each label */}
          {(i < visible.length - 1 || remaining > 0) && " "}
        </React.Fragment>
      ))}
      {remaining > 0 && (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          +{remaining} {t("more")}
        </span>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;
const SAVED_COUNT = { len: -1, count: PAGE_SIZE };

export default function EventsTable({ payoutPaid, workspaceId, events, clients, teamMap = {}, serviceMap = {}, assignmentsByEvent = {}, receiptsByEvent = {}, addonsByEvent = {}, serviceAssignmentsByEvent = {}, currency = "INR", flat = false, loading, onEventClick, onEditEvent, onDeleteEvent, onAdd, canAdd, term }) {
  const tm = term || {};
  const t = useT();
  const prefs = useDisplayPreferences();
  const desktopGridCols = getDesktopGridCols(prefs);

  // How many rows "Load More" has shown is remembered for the session, so Back from an event finds the row it
  // left (otherwise the list drops to 20 and the scroll position cannot be restored). A new list size resets it.
  const [visibleCount, setVisibleCount] = useState(() => (SAVED_COUNT.len === events.length ? SAVED_COUNT.count : PAGE_SIZE));
  const lenRef = useRef(events.length);
  useEffect(() => {
    if (lenRef.current === events.length) return;
    lenRef.current = events.length;
    setVisibleCount(PAGE_SIZE);
  }, [events.length]);
  useEffect(() => { SAVED_COUNT.len = events.length; SAVED_COUNT.count = visibleCount; }, [events.length, visibleCount]);

  // Which events have Track items (and how many are delivered), for the Track button in each row. One light query.
  const navigate = useNavigate();
  const trackOn = prefs.showTrackTab !== false;
  const { data: trackByEvent = {} } = useQuery({
    queryKey: ["event-deliverables", "by-event", workspaceId],
    queryFn: async () => {
      const rows = await base44.entities.EventDeliverable.filter({ workspace_id: workspaceId }, "-created_date", 1000);
      const map = {};
      for (const r of rows || []) {
        const m = (map[r.event_id] ||= { total: 0, done: 0 });
        m.total += 1;
        if (r.status === "delivered") m.done += 1;
      }
      return map;
    },
    enabled: !!workspaceId && trackOn,
    staleTime: 30 * 1000
  });
  const openTrack = (e) => navigate(`/events/${e.id}?tab=Track`);

  if (loading) {
    return <EventsTableSkeleton />;
  }

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[15px] shadow-card">
        <EmptyState
          title={tm.emptyTitle || t("No events yet")}
          description={tm.emptyDescription || t("Create your first event to get started.")}
          action={canAdd ? <Button onClick={onAdd}>+ {tm.addWorkItemLabel || t("Add Event")}</Button> : null}
        />
      </div>
    );
  }

  const clientName = (id) => clients[id]?.name || "—";

  // "flat" (set when a Sort option is chosen) skips date grouping so the sort order isn't split into buckets.
  const groupEvents = prefs.groupUpcoming !== false && !flat;
  const buckets = groupEvents ? bucketEvents(events) : null;

  const orderedEvents = groupEvents
    ? [...buckets.ongoing, ...buckets.today, ...buckets.tomorrow, ...buckets.week, ...buckets.month, ...buckets.upcoming, ...buckets.rest]
    : events;
  const visibleEvents = orderedEvents.slice(0, visibleCount);
  const hasMore = orderedEvents.length > visibleCount;

  const visibleBuckets = groupEvents ? bucketEvents(visibleEvents) : null;
  const sections = groupEvents
    ? [
        { key: "ongoing", label: "In Progress", items: visibleBuckets.ongoing },
        { key: "today", label: "Today", items: visibleBuckets.today },
        { key: "tomorrow", label: "Tomorrow", items: visibleBuckets.tomorrow },
        { key: "week", label: "This Week", items: visibleBuckets.week },
        { key: "month", label: "This Month", items: visibleBuckets.month },
        { key: "upcoming", label: "Upcoming", items: visibleBuckets.upcoming },
        { key: "rest", label: null, items: visibleBuckets.rest }
      ].filter((s) => s.items.length > 0)
    : [];

  // Phones: each event is its own card with space between them, and a soft dashed line after the last one separates the
  // list from the widgets below it. From sm up: one table card.
  return (
    <div className="max-sm:pb-5 max-sm:border-b-2 max-sm:border-dashed max-sm:border-border/70 sm:bg-card sm:border sm:border-border sm:rounded-[15px] sm:shadow-card sm:overflow-hidden">
      <div className={cn("hidden sm:grid gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide", desktopGridCols)}>
        <span>{t("ID")}</span>
        <span>{t("Name")}</span>
        <span>{t("Type")}</span>
        <span>{t("Date(s)")}</span>
        {prefs.showProgressIndicators && <span>{t("Status")}</span>}
        <span />
      </div>

      {groupEvents ? (
        <>
          {sections.map((section, i) => (
            <div key={section.key}>
              <div className={cn("px-1 pb-2 pt-1 sm:px-4 sm:py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:bg-muted/30", i > 0 && "mt-3 sm:mt-0 sm:border-t sm:border-border")}>
                {section.label
                  ? `${section.items.length} ${tm.workItemSingular || t("Event")}${section.items.length > 1 ? "s" : ""} ${t(section.label)}`
                  : `${t("All")} ${tm.workItemPlural || t("Events")}`}
              </div>
              {section.items.map((e) => (
                <Row key={e.id} event={e} workspaceId={workspaceId} term={t} prefs={prefs} desktopGridCols={desktopGridCols} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} serviceAssignmentsByEvent={serviceAssignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} payoutPaid={payoutPaid} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} track={trackOn ? trackByEvent[e.id] : null} onTrack={() => openTrack(e)} />
              ))}
            </div>
          ))}
        </>
      ) : (
        visibleEvents.map((e) => (
          <Row key={e.id} event={e} workspaceId={workspaceId} term={t} prefs={prefs} desktopGridCols={desktopGridCols} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} serviceAssignmentsByEvent={serviceAssignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} payoutPaid={payoutPaid} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} track={trackOn ? trackByEvent[e.id] : null} onTrack={() => openTrack(e)} />
        ))
      )}

      {hasMore && (
        <div className="px-4 py-3 sm:border-t sm:border-border flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            <Loader2 className="w-3.5 h-3.5" /> {t("Load More")} ({orderedEvents.length - visibleCount} {t("remaining")})
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ event, workspaceId, clientName, teamMap, serviceMap, assignmentsByEvent, serviceAssignmentsByEvent, receiptsByEvent, addonsByEvent, payoutPaid, currency, onClick, onEdit, onDelete, track, onTrack, prefs, desktopGridCols }) {
  const t = useT();
  const teamNames = (event.team_member_ids || []).map((id) => teamMap[id]?.name).filter(Boolean);
  const serviceNames = (event.service_ids || []).map((id) => serviceMap[id]?.name).filter(Boolean);
  const eventAssignments = assignmentsByEvent?.[event.id] || [];
  const serviceAssignments = serviceAssignmentsByEvent?.[event.id] || [];
  const [open, setOpen] = useState(false);
  const shortId = event.display_id || `#${event.id.slice(-4)}`;
  const totalReceived = receiptsByEvent?.[event.id] || 0;
  const addonTotal = addonsByEvent?.[event.id] || 0;
  const miscItems = parseMiscExpenses(event.misc_expenses_json);
  const contractValue = (event.contract_value || 0) + miscExpensesTotal(miscItems) + addonTotal;
  const remaining = Math.max(0, contractValue - totalReceived);
  const CurrencyIcon = currencyIcon(currency);

  // Event dot turns green only when the client has paid in full AND every external
  // team member / service provider is settled. Owner (SELF) share needs no payment.
  const payoutsPending = !!payoutPaid && (
    eventAssignments.some((a) => !teamMap[a.team_member_id]?.is_self && (payoutPaid.teamPaid[a.id] || 0) < (Number(a.agreed_rate) || 0)) ||
    serviceAssignments.some((a) => !(a.provider_id && teamMap[a.provider_id]?.is_self) && (payoutPaid.servicePaid[a.id] || 0) < (Number(a.agreed_rate) || 0))
  );

  // Team/service payment status dots need this event's own TEAM_PAYMENT and
  // BUSINESS_EXPENSE transactions — fetched only when the row is expanded so
  // the main list stays fast (see Events.jsx for why these aren't fetched
  // workspace-wide up front).
  const { data: payoutTx } = useQuery({
    queryKey: ["event-payout-transactions", event.id],
    queryFn: () => base44.entities.FinancialTransaction.filter(
      { workspace_id: workspaceId, event_id: event.id, status: "ACTIVE" }, "-transaction_date", 200
    ),
    enabled: open && !!workspaceId,
    staleTime: 15 * 1000
  });

  return (
    <div className="mb-3 last:mb-0 rounded-[15px] border border-border bg-card shadow-card overflow-hidden sm:mb-0 sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:shadow-none sm:overflow-visible sm:last:border-0">
      <div
        className={cn("grid grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer", desktopGridCols)}
        onClick={onClick}
      >
        <div className="min-w-0 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground font-medium">{shortId}</div>
            <div className="flex items-center gap-1.5 shrink-0"><StatusBadge status={event.status} cardView /><SettledBadge event={event} compact /></div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {prefs?.showStatusDots && <PaymentDot paid={totalReceived} agreed={contractValue} blocked={payoutsPending} />}
            <span className="text-sm font-semibold text-foreground truncate">{event.title}</span>
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-foreground truncate">{clientName}</span>
            {event.event_type && (
              <>
                <span className="text-muted-foreground shrink-0">·</span>
                <span className="text-muted-foreground truncate">
                  <EventTypeBadge eventType={event.event_type} />
                </span>
              </>
            )}
          </div>
          <div className="mt-1">
            <DateChips event={event} maxChips={2} />
          </div>
        </div>

        <span className="text-sm text-muted-foreground font-medium hidden sm:block">{shortId}</span>
        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          {prefs?.showStatusDots && <PaymentDot paid={totalReceived} agreed={contractValue} blocked={payoutsPending} />}
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
            <div className="text-xs text-muted-foreground truncate">{clientName}</div>
          </div>
        </div>
        <span className="hidden sm:block text-sm text-foreground">
          <EventTypeBadge eventType={event.event_type} />
        </span>
        <div className="hidden sm:block">
          <DateChips event={event} maxChips={3} />
        </div>
        {prefs?.showProgressIndicators && (
          <div className="hidden sm:flex items-center gap-1.5 min-w-0">
            <StatusBadge status={event.status} cardView />
            <SettledBadge event={event} compact />
          </div>
        )}
        <button
          className="sm:hidden flex items-center justify-center w-11 h-11 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors justify-self-end touch-min"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? t("Collapse") : t("Expand")}
        >
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <button
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors justify-self-end"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? t("Collapse") : t("Expand")}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <Collapse open={open}>
        <div className="px-4 pb-4 sm:pl-[130px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Details")}</div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {track?.total > 0 && (
                // A pill (icon + delivered/total) so the count sits beside the icon instead of on top of it.
                <button
                  type="button"
                  onClick={onTrack}
                  title={`${t("Track")} · ${track.done}/${track.total} ${t("delivered")}`}
                  aria-label={`${t("Track")} ${track.done}/${track.total}`}
                  className={cn(
                    "h-8 pl-2.5 pr-3 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums transition-colors",
                    track.done === track.total
                      ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
                      : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  {track.done}/{track.total}
                </button>
              )}
              <RoundIconButton onClick={onEdit} title={t("Edit")} aria-label={t("Edit")}>
                <Pencil className="w-3.5 h-3.5" />
              </RoundIconButton>
              <RoundIconButton onClick={onClick} title={t("View")} aria-label={t("View")}>
                <ArrowRight className="w-3.5 h-3.5" />
              </RoundIconButton>
              <RoundIconButton onClick={onDelete} title={t("Delete")} aria-label={t("Delete")} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </RoundIconButton>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {contractValue > 0 && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/40 border border-border">
                <CurrencyIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{t("Contract:")}</span>
                <span className="text-xs font-semibold text-foreground">{formatMoney(contractValue, currency)}</span>
                <span className="text-xs text-muted-foreground ml-auto">{t("Remaining:")}</span>
                <span className={cn("text-xs font-semibold", remaining > 0 ? "text-warning" : "text-success")}>{formatMoney(remaining, currency)}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{event.venue}{event.venue_address ? ` · ${event.venue_address}` : ""}</span>
              </div>
            )}
            {prefs?.showTeam && eventAssignments.length > 0 ? (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0 space-y-1.5 flex-1">
                  {groupByMemberType(eventAssignments).map(([typeKey, group]) => (
                    <div key={typeKey}>
                      {/* No member type: just list the people (an "Unassigned" chip read as if nobody was assigned). */}
                      {(group[0].member_type_snapshot || group[0].member_type_id) && (
                        <MemberTypeTag label={group[0].member_type_snapshot} typeId={group[0].member_type_id} cardView />
                      )}
                      <ul className={cn("space-y-1 min-w-0", (group[0].member_type_snapshot || group[0].member_type_id) && "mt-1")}>
                        {group.map((a) => {
                          const m = teamMap[a.team_member_id];
                          const name = m?.name || t("Unknown");
                          const role = a.role_name_snapshot || m?.profession || "—";
                          const dates = formatAssignedDates(a, event);
                          return (
                            <li key={a.id} className="text-xs break-anywhere flex items-center gap-1.5 flex-wrap">
                              {prefs?.showStatusDots && <PaymentDot paid={m?.is_self ? totalReceived : assignmentPaid(payoutTx, a.id)} agreed={m?.is_self ? contractValue : a.agreed_rate} />}
                              <span className="font-medium text-foreground">{name}</span>
                              <span className="text-muted-foreground">({role})</span>
                              <span className="text-muted-foreground">— {dates}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : prefs?.showTeam && teamNames.length > 0 && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {teamNames.map((n) => (
                    <span key={n} className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">{n}</span>
                  ))}
                </div>
              </div>
            )}
            {prefs?.showServices && serviceAssignments.length > 0 && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <ul className="space-y-1 min-w-0">
                  {serviceAssignments.map((a) => {
                    const svcName = a.service_name_snapshot || serviceMap[a.service_id]?.name || t("Unknown");
                    const provider = a.provider_name_snapshot || (a.provider_id ? teamMap[a.provider_id]?.name : "") || "";
                    const dates = formatAssignedDates(a, event);
                    return (
                      <li key={a.id} className="text-xs break-anywhere flex items-center gap-1.5 flex-wrap">
                        {prefs?.showStatusDots && <PaymentDot paid={a.provider_id && teamMap[a.provider_id]?.is_self ? totalReceived : serviceAssignmentPaid(payoutTx, a.id)} agreed={a.provider_id && teamMap[a.provider_id]?.is_self ? contractValue : a.agreed_rate} />}
                        {provider
                          ? <><span className="font-medium text-foreground">{provider}</span><span className="text-muted-foreground">({svcName})</span></>
                          : <span className="font-medium text-foreground">{svcName}</span>}
                        <span className="text-muted-foreground">— {dates}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {prefs?.showAddressOnCards && event.description && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{event.description}</span>
              </div>
            )}
            {prefs?.showAddressOnCards && event.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{event.notes}</span>
              </div>
            )}
            {!event.venue && !event.description && !event.notes && teamNames.length === 0 && serviceNames.length === 0 && serviceAssignments.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("No additional details.")}</p>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
}