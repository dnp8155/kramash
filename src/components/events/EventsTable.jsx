import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, MapPin, FileText, StickyNote, ArrowRight, Users, Briefcase, Trash2, IndianRupee } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import { formatEventDates, isThisWeek, formatAssignedDates } from "@/lib/dates";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { formatMoney } from "@/utils/format";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import PaymentDot from "@/components/common/PaymentDot";
import MemberTypeTag from "@/components/common/MemberTypeTag";
import { cn } from "@/lib/utils";

export default function EventsTable({ events, clients, teamMap = {}, serviceMap = {}, assignmentsByEvent = {}, receiptsByEvent = {}, addonsByEvent = {}, currency = "INR", loading, onEventClick, onEditEvent, onDeleteEvent, onAdd, canAdd, term }) {
  const t = term || {};
  const prefs = useDisplayPreferences();
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-card">
        <LoadingState label={`Loading ${t.workItemPlural?.toLowerCase() || "events"}…`} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-card">
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

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
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
          {weekEvents.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                {weekEvents.length} {t.workItemSingular || "Event"}{weekEvents.length > 1 ? "s" : ""} This Week
              </div>
              {weekEvents.map((e) => (
                <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
              ))}
            </>
          )}

          {laterEvents.length > 0 && (
            <>
              <div className={cn("px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30", weekEvents.length > 0 && "border-t border-border")}>
                All {t.workItemPlural || "Events"}
              </div>
              {laterEvents.map((e) => (
                <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
              ))}
            </>
          )}
        </>
      ) : (
        events.map((e) => (
          <Row key={e.id} event={e} term={t} prefs={prefs} clientName={clientName(e.client_id)} teamMap={teamMap} serviceMap={serviceMap} assignmentsByEvent={assignmentsByEvent} receiptsByEvent={receiptsByEvent} addonsByEvent={addonsByEvent} currency={currency} onClick={() => onEventClick(e)} onEdit={() => onEditEvent(e)} onDelete={() => onDeleteEvent(e)} />
        ))
      )}
    </div>
  );
}

function Row({ event, clientName, teamMap, serviceMap, assignmentsByEvent, receiptsByEvent, addonsByEvent, currency, onClick, onEdit, onDelete, term, prefs }) {
  const teamNames = (event.team_member_ids || []).map((id) => teamMap[id]?.name).filter(Boolean);
  const serviceNames = (event.service_ids || []).map((id) => serviceMap[id]?.name).filter(Boolean);
  const eventAssignments = assignmentsByEvent?.[event.id] || [];
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
          <div className="text-xs text-muted-foreground mt-0.5">{event.event_type} · {formatEventDates(event)}</div>
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
        <span className="text-sm text-foreground hidden sm:block">{event.event_type}</span>
        <span className="text-sm text-muted-foreground hidden sm:block">{formatEventDates(event)}</span>
        <div className="hidden sm:flex items-center gap-2">
          <StatusBadge status={event.status} />
        </div>
        <button
          className="text-muted-foreground hover:text-foreground justify-self-end"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:pl-[130px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Hide details <ChevronUp className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-2">
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
            {prefs?.showAddressOnCards && event.venue && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{event.venue}{event.venue_address ? ` · ${event.venue_address}` : ""}</span>
              </div>
            )}
            {event.description && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{event.description}</span>
              </div>
            )}
            {event.notes && (
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
                          <MemberTypeTag label={a.member_type_snapshot} typeId={a.member_type_id} />
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
            {prefs?.showServicesOnCards && serviceNames.length > 0 && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {serviceNames.map((n) => (
                    <span key={n} className="rounded-full bg-muted text-foreground border border-border px-2.5 py-0.5 text-xs font-medium">{n}</span>
                  ))}
                </div>
              </div>
            )}
            {!event.venue && !event.description && !event.notes && teamNames.length === 0 && serviceNames.length === 0 && (
              <p className="text-xs text-muted-foreground">No additional details. Click "View Details" for the full {(term?.workItemSingular || "event").toLowerCase()} page.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}