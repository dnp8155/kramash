import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import DetailSkeleton from "@/components/common/DetailSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DetailErrorState from "@/components/common/DetailErrorState";
import EventForm from "@/components/events/EventForm";
import EventAssignmentCard from "@/components/events/EventAssignmentCard";
import EventServicesTab from "@/components/events/EventServicesTab";
import EventProgressTab from "@/components/events/EventProgressTab";
import EventFinancialsTab from "@/components/events/EventFinancialsTab";
import AssignTeamDialog from "@/components/team/AssignTeamDialog";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import { useToast } from "@/components/ui/use-toast";
import { currentFY, fyRange, fyForDate, formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import {
  eventFinancialSummary,
  clientPaymentStatus,
  loadExpenseCategories
} from "@/lib/financeService";
import {
  ArrowLeft, Pencil, Wallet, FileText, MapPin, Calendar, Phone, Plus,
  CalendarPlus, Share2, Receipt, StickyNote, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { invalidateEntities } from "@/lib/queryInvalidation";

export default function EventDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const term = useBusinessTerminology();

  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [teamPayAssignment, setTeamPayAssignment] = useState(null);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [tab, setTab] = useState("Team");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["event", id, workspaceId],
    queryFn: async () => {
      const ev = await base44.entities.Event.get(id);
      if (!ev || ev.workspace_id !== workspaceId) return { notFound: true };
      const [clList, membs, rles, asgns, tx, cats, blocks, svcs, dayAsgns] = await Promise.all([
        ev.client_id ? base44.entities.Client.get(ev.client_id).catch(() => null) : Promise.resolve(null),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, event_id: ev.id }, "-transaction_date", 500),
        loadExpenseCategories(workspaceId),
        base44.entities.TeamBlockDate.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId }, "date", 1000)
      ]);
      const [quotes, invs] = await Promise.all([
        base44.entities.Quotation.filter({ workspace_id: workspaceId, event_id: ev.id }, "-quotation_date", 200).catch(() => []),
        base44.entities.Invoice.filter({ workspace_id: workspaceId, event_id: ev.id }, "-invoice_date", 200).catch(() => [])
      ]);
      const evIds = [...new Set((asgns || []).map((a) => a.event_id))];
      const evMap = {};
      evMap[ev.id] = ev;
      await Promise.all(
        evIds.filter((eid) => eid !== ev.id).map(async (eid) => {
          try {
            const e = await base44.entities.Event.get(eid);
            if (e && e.workspace_id === workspaceId) evMap[eid] = e;
          } catch (e) { /* skip */ }
        })
      );
      return {
        notFound: false,
        event: ev,
        client: clList && clList.workspace_id === workspaceId ? clList : null,
        members: membs || [],
        roles: rles || [],
        assignments: asgns || [],
        transactions: tx || [],
        categories: cats || [],
        blockDates: blocks || [],
        services: svcs || [],
        dayAssignments: dayAsgns || [],
        eventsById: evMap,
        quotations: quotes || [],
        invoices: invs || []
      };
    },
    enabled: !!id && !!workspaceId
  });
  const event = data?.event || null;
  const client = data?.client || null;
  const members = data?.members || [];
  const roles = data?.roles || [];
  const assignments = data?.assignments || [];
  const transactions = data?.transactions || [];
  const categories = data?.categories || [];
  const blockDates = data?.blockDates || [];
  const services = data?.services || [];
  const dayAssignments = data?.dayAssignments || [];
  const eventsById = data?.eventsById || {};
  const quotations = data?.quotations || [];
  const invoices = data?.invoices || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["event", id, workspaceId] });
    // Also refresh every other page that depends on this event's data:
    // dashboard stats/calendar, events list, financial totals, team-member bookings.
    invalidateEntities(queryClient, ["Event", "EventTeamAssignment", "EventDayAssignment", "FinancialTransaction"]);
  };

  const eventAssignments = useMemo(
    () => assignments.filter((a) => a.event_id === id && a.assignment_status !== "removed"),
    [assignments, id]
  );

  const membersById = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);

  const fin = useMemo(
    () => eventFinancialSummary(event, transactions, eventAssignments),
    [event, transactions, eventAssignments]
  );
  const clientStatus = clientPaymentStatus(fin.received, fin.contractValue);
  const currency = workspace?.currency || "INR";

  const teamTotalRate = fin.teamAgreed;
  const teamTotalPaid = fin.teamPaid;
  const teamTotalRemaining = Math.max(0, fin.teamAgreed - fin.teamPaid);

  const removeAssignment = async (a) => {
    try {
      await base44.entities.EventTeamAssignment.update(a.id, { assignment_status: "removed" });
      // Keep event.team_member_ids in sync so the Events table reflects removals.
      const currentIds = Array.isArray(event?.team_member_ids) ? event.team_member_ids : [];
      if (currentIds.includes(a.team_member_id)) {
        await base44.entities.Event.update(event.id, {
          team_member_ids: currentIds.filter((x) => x !== a.team_member_id)
        });
      }
      toast({ title: `Team member removed from ${term.workItemSingular.toLowerCase()}` });
      load();
    } catch (e) {
      toast({ title: "Failed to remove assignment", description: e?.message, variant: "destructive" });
    }
  };

  const shareAssignment = async (a) => {
    const m = membersById[a.team_member_id];
    const text = `${m?.name || "Team member"} ${term.bookedLabel} ${event?.title || term.workItemSingular.toLowerCase()} — Rate: ${formatMoney(a.agreed_rate, currency)}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  const addToCalendar = () => {
    if (!event) return;
    const start = event.start_date ? event.start_date.replace(/-/g, "") : "";
    const end = event.end_date ? event.end_date.replace(/-/g, "") : start;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0",       "PRODID:-//KRAMAS//WorkItem//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@kramas`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${event.title}`,
      event.venue ? `LOCATION:${event.venue}` : "",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title || term.workItemSingular.toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remindClient = () => {
    if (!client?.phone) {
      toast({ title: "No client phone number", variant: "destructive" });
      return;
    }
    const due = Math.max(0, fin.pending);
    const msg = `Hi ${client.name}, this is a gentle reminder about your pending balance of ${formatMoney(due, currency)} for ${event?.title || `your ${term.workItemSingular.toLowerCase()}`}. Thank you!`;
    const phone = client.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareEventLink = async () => {
    const url = `${window.location.origin}/track/${event.id}`;
    const shareText = `Track your ${term.workItemSingular.toLowerCase()} "${event.title}" here: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url });
      } catch (e) { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Link copied!", description: "Share it with your client." });
      } catch (e) {
        toast({ title: "Copy this link", description: url });
      }
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (hasError) {
    return (
      <DetailErrorState
        title="Failed to load"
        description={error?.message || "Something went wrong. Please try again."}
        onBack={() => navigate("/events")}
        onRetry={load}
        backLabel={`Back to ${term.workItemPlural}`}
      />
    );
  }

  if (notFound || !event) {
    return (
      <DetailErrorState
        title={`${term.workItemSingular} not found`}
        description={`This ${term.workItemSingular.toLowerCase()} may not exist or you don't have access to it.`}
        onBack={() => navigate("/events")}
        backLabel={`Back to ${term.workItemPlural}`}
      />
    );
  }

  const tabs = ["Team", "Financials", "Services", "Payments", "Notes", "Progress"];
  const eventTransactions = transactions.filter((t) => t.status === "ACTIVE");

  const toggleService = async (serviceId) => {
    const current = event.service_ids || [];
    const has = current.includes(serviceId);
    const updated = has ? current.filter((x) => x !== serviceId) : [...current, serviceId];
    try {
      await base44.entities.Event.update(event.id, { service_ids: updated });
      toast({ title: has ? "Service removed" : "Service added" });
      load();
    } catch (e) {
      toast({ title: "Failed to update services", description: e?.message, variant: "destructive" });
    }
  };

  const fyLabel = (() => {
    const fy = event?.financial_year || fyForDate(event?.start_date) || currentFY();
    const r = fyRange(fy);
    if (!r) return "—";
    const s = r.start.split("-"), e = r.end.split("-");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[Number(s[1])-1]} ${s[0]} – ${m[Number(e[1])-1]} ${e[0]}`;
  })();

  const statusDot = event.status === "completed" ? "bg-success" : event.status === "cancelled" ? "bg-destructive" : "bg-warning";
  const allDates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <button onClick={() => navigate("/events")} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{event.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", statusDot)} />
              <span className="capitalize">{event.status}</span>
            </span>
            {event.event_type && <> · {event.event_type}</>}
            {event.start_date && <> · {formatEventDate(event.start_date, event.end_date)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" onClick={() => navigate("/events/new")}>
            <Plus className="w-3.5 h-3.5" /> New Entry
          </Button>
        </div>
      </div>

      {/* Entry details + Financial summary side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Entry details — spans 2 columns */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Entry Details</h2>
            <button
              onClick={() => { if (confirm(`Delete this ${term.workItemSingular.toLowerCase()}?`)) { base44.entities.Event.delete(event.id).then(() => navigate("/events")); } }}
              className="text-destructive/60 hover:text-destructive hover:bg-destructive/5 p-1.5 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Primary info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <DetailField label="Client / Event" value={event.title} />
            <DetailField label="Event Type" value={event.event_type || "—"} />
            <DetailField label="Contract Value" value={formatMoney(event.contract_value || 0, currency)} />
            <DetailField label="Start Date" value={event.start_date ? formatEventDate(event.start_date) : "—"} />
            <DetailField label="End Date" value={event.end_date ? formatEventDate(event.end_date) : "—"} />
            <DetailField label="Financial Year" value={fyLabel} />
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-border/60" />

          {/* Contact + venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailField label="Contact" value={client?.phone || "—"} icon={Phone} />
            <DetailField label="Venue" value={event.venue || "—"} icon={MapPin} />
          </div>
          <div className="mt-4">
            <DetailField label="Address" value={[client?.address, client?.city].filter(Boolean).join(", ") || "—"} />
          </div>

          {/* Date chips */}
          {allDates.length > 0 && (
            <>
              <div className="my-5 border-t border-border/60" />
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2.5">Event Date(s)</div>
                <div className="flex flex-wrap gap-2">
                  {allDates.map((d) => <DateChip key={d} date={d} />)}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Financial summary — right column */}
        <div className="space-y-3">
          <FinancialMiniCard label="Received" value={formatMoney(fin.received, currency)} tone="success" />
          <FinancialMiniCard label="Paid" value={formatMoney(fin.teamPaid, currency)} tone="warning" />
          <FinancialMiniCard label="Left Balance" value={formatMoney(Math.max(0, fin.pending), currency)} tone="accent" />
          <FinancialMiniCard label="Profit" value={formatMoney(fin.profit, currency)} tone="success" />
        </div>
      </div>

      {/* Contextual actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={addToCalendar}>
          <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
        </Button>
        <Button size="sm" variant="primary" onClick={shareEventLink}>
          <Share2 className="w-3.5 h-3.5" /> Share Link
        </Button>
        {fin.pending > 0 && (
          <Button size="sm" variant="primary" onClick={remindClient}>
            <Share2 className="w-3.5 h-3.5" /> Remind {formatMoney(fin.pending, currency)} due
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
          <FileText className="w-3.5 h-3.5" /> Create Quotation
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "Financials" && (
        <EventFinancialsTab
          event={event}
          quotations={quotations}
          invoices={invoices}
          transactions={transactions}
          assignments={assignments}
          currency={currency}
          workspace={workspace}
          onRefresh={load}
        />
      )}

      {tab === "Services" && (
        <EventServicesTab
          event={event}
          services={services}
          currency={currency}
          onAddService={() => setShowServicePicker(true)}
          onRemoveService={(sid) => toggleService(sid)}
        />
      )}

      {tab === "Progress" && (
        <EventProgressTab
          event={event}
          workspaceId={workspaceId}
          members={members}
          services={services}
          dayAssignments={dayAssignments}
          otherDayAssignments={dayAssignments.filter((a) => a.event_id !== event.id)}
          blockDates={blockDates}
          onChanged={load}
        />
      )}

      {tab === "Team" && (
        <div className="space-y-4">
          {/* Team summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <TeamStatCard label="Total Rate" value={formatMoney(teamTotalRate, currency)} />
            <TeamStatCard label="Total Payments" value={formatMoney(teamTotalPaid, currency)} />
            <TeamStatCard label="Total Remaining" value={formatMoney(teamTotalRemaining, currency)} tone="warning" />
          </div>

          {/* Assignments */}
          {eventAssignments.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                title="No team assigned"
                description={`Add team members to this ${term.workItemSingular.toLowerCase()} to track their payments.`}
                action={
                  <Button size="sm" onClick={() => setShowAssign(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Team Member
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eventAssignments.map((a) => (
                  <EventAssignmentCard
                    key={a.id}
                    assignment={a}
                    member={membersById[a.team_member_id]}
                    event={event}
                    currency={currency}
                    transactions={transactions}
                    onAddPayment={(asg) => setTeamPayAssignment(asg)}
                    onRemove={removeAssignment}
                    onShare={shareAssignment}
                    onRefresh={load}
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <Button onClick={() => setShowAssign(true)}>
                  <Plus className="w-4 h-4" /> Add Team Member
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "Payments" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-foreground">
              Transactions ({eventTransactions.length})
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowClientPayment(true)}>
                <Wallet className="w-3.5 h-3.5" /> Client Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowExpense(true)}>
                <Receipt className="w-3.5 h-3.5" /> Expense
              </Button>
            </div>
          </div>
          {eventTransactions.length === 0 ? (
            <EmptyState title="No transactions yet" description={`Record client payments or expenses for this ${term.workItemSingular.toLowerCase()}.`} />
          ) : (
            <div className="divide-y divide-border">
              {eventTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {t.transaction_type === "CLIENT_RECEIPT" ? "Client Payment" :
                       t.transaction_type === "TEAM_PAYMENT" ? "Team Payment" : "Expense"}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatEventDate(t.transaction_date)} · {t.payment_method}</div>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    t.transaction_type === "CLIENT_RECEIPT" ? "text-success" : "text-warning"
                  )}>
                    {t.transaction_type === "CLIENT_RECEIPT" ? "+" : "-"}{formatMoney(t.amount, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "Notes" && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Notes</span>
          </div>
          {event.notes || event.description ? (
            <div className="space-y-3">
              {event.description && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
              {event.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{event.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No notes" description={`Edit the ${term.workItemSingular.toLowerCase()} to add notes or a description.`} />
          )}
        </Card>
      )}

      {/* Dialogs */}
      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
        term={term}
        currency={currency}
      />

      <AssignTeamDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
        members={members.filter((m) => m.status === "active")}
        roles={roles.filter((r) => r.status === "active")}
        assignments={assignments}
        eventsById={eventsById}
        blockDates={blockDates}
      />

      <RecordPaymentDialog
        open={showClientPayment}
        onClose={() => setShowClientPayment(false)}
        onSaved={load}
        mode="client"
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        clientsById={client ? { [client.id]: client } : {}}
        preselectedEventId={event.id}
        preselectedClientId={client?.id || ""}
      />

      <RecordPaymentDialog
        open={!!teamPayAssignment}
        onClose={() => setTeamPayAssignment(null)}
        onSaved={load}
        mode="team"
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        assignments={eventAssignments}
        membersById={membersById}
        preselectedEventId={event.id}
        preselectedAssignmentId={teamPayAssignment?.id || ""}
      />

      <RecordExpenseDialog
        open={showExpense}
        onClose={() => setShowExpense(false)}
        onSaved={load}
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        categories={categories}
        preselectedEventId={event.id}
      />

      {/* Service picker dialog */}
      {showServicePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowServicePicker(false)}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Add Services</h3>
              <button onClick={() => setShowServicePicker(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {services.filter((s) => s.status === "active").map((s) => {
                const selected = (event.service_ids || []).includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                      selected ? "bg-primary/5 border-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.rate_type} · {formatMoney(s.default_rate || 0, currency)}</div>
                    </div>
                    {selected && <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">✓</div>}
                  </button>
                );
              })}
              {services.filter((s) => s.status === "active").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No services available. Create services first.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

function FinancialMiniCard({ label, value, tone = "default" }) {
  const toneClasses = {
    success: "text-success",
    warning: "text-warning",
    accent: "text-foreground",
    default: "text-foreground"
  };
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5 hover-lift">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", toneClasses[tone])}>{value}</div>
    </div>
  );
}

function DateChip({ date }) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/8 text-primary text-xs font-semibold border border-primary/15">
      <Calendar className="w-3 h-3" />
      {day} {month}
    </span>
  );
}

function TeamStatCard({ label, value, tone = "default" }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn(
        "text-lg font-bold mt-1 tabular-nums",
        tone === "warning" ? "text-warning" : "text-foreground"
      )}>{value}</div>
    </div>
  );
}