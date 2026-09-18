import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Pencil, MapPin, FileText, StickyNote, ArrowRight, Users, Briefcase, Trash2, IndianRupee, Loader2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import EventsTableSkeleton from "@/components/events/EventsTableSkeleton";
import { formatEventDates, isThisWeek, formatAssignedDates } from "@/lib/dates";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { formatMoney } from "@/utils/format";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import PaymentDot from "@/components/common/PaymentDot";
import MemberTypeTag from "@/components/common/MemberTypeTag";
import EventTypeBadge from "@/components/common/EventTypeBadge";
import { cn } from "@/lib/utils";

// Compact date chip formatter — "26 Aug" or "26 Aug 2026" if not current year.
const fmtChip = (d) => {
  try {
    const dt = new Date(d + "T00:00:00");
    const now = new Date();
    const sameYear = dt.getFullYear() === now.getFullYear();
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  } catch {
    return d;
  }
};

// Read-only date chips (no "x" buttons) with "+N more" overflow indicator.
// Falls back to text format for legacy events without an event_dates array.
function DateChips({ event, maxChips = 3 }) {
  const dates = event?.event_dates;
  if (!Array.isArray(dates) || dates.length === 0) {
    return <span className="text-sm text-muted-foreground">{formatEventDates(event)}</span>;
  }
  const sorted = [...dates].sort();
  const visible = sorted.slice(0, maxChips);
  const remaining = sorted.length - maxChips;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((d) => (
        <span key={d} className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
          {fmtChip(d)}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

export default function EventsTable({ events, clients, teamMap = {}, serviceMap = {}, assignmentsByEvent = {}, receiptsByEvent = {}, addonsByEvent = {}, serviceAssignmentsByEvent = {}, currency = "INR", loading, onEventClick, onEditEvent, onDeleteEvent, onAdd, canAdd, term }) {
  const t = term || {};
  const prefs = useDisplayPreferences();

  // Lazy loading — show events in increments of PAGE_SIZE with a "Load More" button.
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [events.length]);

  if (loading) {
    return <EventsTableSkeleton />;
  }

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[15px] shadow-card">
        <EmptyState
          title={t.emptyTitle || "No events yet"}
          description={t.emptyDescription || "Create your first event to get started."}
          action={canAdd ? <Button onClick={onAdd}>+ {t.addWorkItemLabel || "Add Event"}</Button> : null}
        />
      </div>
    );
  }

  const clientName = (id) => clients[id]?.name || "—";

  const weekEvents = events.filter((e) => isThisWeek(e.start_date));
  const laterEvents = events.filter((e) => !isThisWeek(e.start_date));
  const groupEvents = prefs.groupUpcoming !== false;

  const orderedEvents = groupEvents ? [...weekEvents, ...laterEvents] : events;
  const visibleEvents = orderedEvents.slice(0, visibleCount);
  const hasMore = orderedEvents.length > visibleCount;

  // Re-split visible events into groups for the grouped layout.
  const visibleWeekEvents = groupEvents ? visibleEvents.filter((e) => isThisWeek(e.start_date)) : [];
  const visibleLaterEvents = groupEvents ? visibleEvents.filter((e) => !isThisWeek(e.start_date)) : [];

  return (
    <div className="bg-card border border-border rounded-[15px] shadow-card overflow-hidden">
      <div className="hidden sm:grid grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>ID</span>
        <span>Name</span>
        <span>Type</span>
        <span>Date(s)</span>
        <span>Status</span>
        <span />
      </div>

      {groupEvents ? (
        <>
          {visibleWeekEvents.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                {visibleWeekEvents.length} {t.workItemSingular || "Event"}{visibleWeekEvents.length > 1 ? "s" : ""} This Week
              </div>
              {visibleWeekEvents.map((e) => (
                <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} serviceAssignmentsByEvent={serviceAssignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
              ))}
            </>
          )}

          {visibleLaterEvents.length > 0 && (
            <>
              <div className={cn("px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30", visibleWeekEvents.length > 0 && "border-t border-border")}>
                All {t.workItemPlural || "Events"}
              </div>
              {visibleLaterEvents.map((e) => (
                <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} serviceAssignmentsByEvent={serviceAssignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
              ))}
            </>
          )}
        </>
      ) : (
        visibleEvents.map((e) => (
          <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} serviceAssignmentsByEvent={serviceAssignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
        ))
      )}

      {hasMore && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            <Loader2 className="w-3.5 h-3.5" /> Load More ({orderedEvents.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ event, clientName, teamMap, serviceMap, assignmentsByEvent, serviceAssignmentsByEvent, receiptsByEvent, addonsByEvent, currency, onClick, onEdit, onDelete, term, prefs }) {
  const teamNames = (event.team_member_ids || []).map((id) => teamMap[id]?.name).filter(Boolean);
  const serviceNames = (event.service_ids || []).map((id) => serviceMap[id]?.name).filter(Boolean);
  const eventAssignments = assignmentsByEvent?.[event.id] || [];
  const serviceAssignments = serviceAssignmentsByEvent?.[event.id] || [];
  const [open, setOpen] = useState(false);
  const shortId = `#${event.id.slice(-4)}`;
  const totalReceived = receiptsByEvent?.[event.id] || 0;
  const addonTotal = addonsByEvent?.[event.id] || 0;
  const miscItems = parseMiscExpenses(event.misc_expenses_json);
  const contractValue = (event.contract_value || 0) + miscExpensesTotal(miscItems) + addonTotal;
  const remaining = Math.max(0, contractValue - totalReceived);

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {/* Mobile — stacked: ID / bullet+name / type · dates */}
        <div className="min-w-0 sm:hidden">
          <div className="text-xs text-muted-foreground font-medium">{shortId}</div>
          <div className="flex items-center gap-2 mt-1">
            <PaymentDot paid={totalReceived} agreed={contractValue} />
            <span className="text-sm font-semibold text-foreground truncate">{event.title}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
            <EventTypeBadge eventType={event.event_type} />
          </div>
          <div className="mt-1">
            <DateChips event={event} maxChips={2} />
          </div>
          <div className="mt-1.5">
            <StatusBadge status={event.status} cardView />
          </div>
          {serviceAssignments.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {serviceAssignments.map((a) => a.provider_name_snapshot || (a.provider_id ? teamMap[a.provider_id]?.name : "") || a.service_name_snapshot || serviceMap[a.service_id]?.name || "Service").join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Desktop columns */}
        <span className="text-sm text-muted-foreground font-medium hidden sm:block">{shortId}</span>
        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          <PaymentDot paid={totalReceived} agreed={contractValue} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
            <div className="text-xs text-muted-foreground">{clientName}</div>
          </div>
        </div>
        <span className="hidden sm:block text-sm text-foreground">
          <EventTypeBadge eventType={event.event_type} />
        </span>
        <div className="hidden sm:block">
          <DateChips event={event} maxChips={3} />
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <StatusBadge status={event.status} cardView />
        </div>
        <button
          className="sm:hidden flex items-center justify-center w-11 h-11 rounded-xl border-2 border-border bg-card text-foreground hover:bg-muted transition-colors justify-self-end touch-min"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </button>
        <button
          className="hidden sm:block text-muted-foreground hover:text-foreground justify-self-end"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:pl-[130px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                <ChevronUp className="w-3 h-3" /> Hide
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onClick}>
                View Details <ArrowRight className="w-3 h-3" />
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {contractValue > 0 && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/40 border border-border">
                <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Contract:</span>
                <span className="text-xs font-semibold text-foreground">{formatMoney(contractValue, currency)}</span>
                <span className="text-xs text-muted-foreground ml-auto">Remaining:</span>
                <span className={cn("text-xs font-semibold", remaining > 0 ? "text-warning" : "text-success")}>{formatMoney(remaining, currency)}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{event.venue}{event.venue_address ? ` · ${event.venue_address}` : ""}</span>
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
            {prefs?.showTeam && eventAssignments.length > 0 ? (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <ul className="space-y-1 min-w-0">
                  {eventAssignments.map((a) => {
                    const m = teamMap[a.team_member_id];
                    const name = m?.name || "Unknown";
                    const role = a.role_name_snapshot || m?.profession || "—";
                    const dates = formatAssignedDates(a, event);
                    return (
                      <li key={a.id} className="text-xs break-anywhere flex items-center gap-1.5 flex-wrap">
                        {(a.member_type_snapshot || a.member_type_id) && (
                          <MemberTypeTag label={a.member_type_snapshot} typeId={a.member_type_id} cardView />
                        )}
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="text-muted-foreground">({role})</span>
                        <span className="text-muted-foreground">— {dates}</span>
                      </li>
                    );
                  })}
                </ul>
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
                    const svcName = a.service_name_snapshot || serviceMap[a.service_id]?.name || "Unknown";
                    const provider = a.provider_name_snapshot || (a.provider_id ? teamMap[a.provider_id]?.name : "") || "";
                    const dates = formatAssignedDates(a, event);
                    return (
                      <li key={a.id} className="text-xs break-anywhere flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">{svcName}</span>
                        {provider && <span className="text-muted-foreground">— {provider}</span>}
                        <span className="text-muted-foreground">— {dates}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {!event.venue && !event.description && !event.notes && teamNames.length === 0 && serviceNames.length === 0 && serviceAssignments.length === 0 && (
              <p className="text-xs text-muted-foreground">No additional details. Click "View Details" for the full {(term?.workItemSingular || "event").toLowerCase()} page.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}