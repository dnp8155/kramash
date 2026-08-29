import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailSkeleton from "@/components/common/DetailSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DetailErrorState from "@/components/common/DetailErrorState";
import EventForm from "@/components/events/EventForm";
import EventFinancialCards from "@/components/events/EventFinancialCards";
import EventAssignmentCard from "@/components/events/EventAssignmentCard";
import DayScheduleCard from "@/components/events/DayScheduleCard";
import AssignTeamDialog from "@/components/team/AssignTeamDialog";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import { useToast } from "@/components/ui/use-toast";
import { formatEventDate, formatEventDates, currentFY, fyRange } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import {
  eventFinancialSummary,
  clientPaymentStatus,
  loadExpenseCategories
} from "@/lib/financeService";
import {
  ArrowLeft, Pencil, Wallet, FileText, MapPin, Calendar, Phone, Plus,
  CalendarPlus, Share2, Receipt, StickyNote, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

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
  const [tab, setTab] = useState("Schedule");
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
        eventsById: evMap
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
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => queryClient.invalidateQueries({ queryKey: ["event", id, workspaceId] });

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

  const tabs = ["Schedule", "Team", "Payments", "Notes"];
  const eventTransactions = transactions.filter((t) => t.status === "ACTIVE");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="dark" size="sm" onClick={() => navigate("/events")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={shareEventLink}>
            <Share2 className="w-4 h-4" /> Share with Client
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Pencil className="w-4 h-4" /> Edit Event
          </Button>
        </div>
      </div>

      {/* Entry details form */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {event.start_date ? new Date(event.start_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
            </div>
            <h2 className="text-base font-semibold">{event.event_type} · {formatEventDates(event)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Event Title" value={event.title} />
          <Field label={term.workItemTypeLabel} value={event.event_type || "—"} />
          <Field label={term.startDateLabel} value={event.start_date || "—"} icon={Calendar} />
          <Field label={term.endDateLabel} value={event.end_date || "—"} icon={Calendar} />
        </div>

        {/* Date chips */}
        <div className="mt-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">Schedule Dates</div>
          <div className="flex flex-wrap gap-2">
            {(event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean).map((d) => (
              <DateChip key={d} date={d} />
            ))}
          </div>
        </div>

        {/* Services */}
        {event.service_ids?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Services</div>
            <div className="flex flex-wrap gap-2">
              {event.service_ids.map((sid) => {
                const s = services.find((x) => x.id === sid);
                if (!s) return null;
                return (
                  <span key={sid} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-foreground border border-border text-sm font-medium">
                    <Briefcase className="w-3.5 h-3.5" /> {s.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Contact Number (optional)" value={client?.phone || "—"} icon={Phone} />
          <Field label={`${term.locationLabel} (optional)`} value={event.venue || "—"} icon={MapPin} />
          <div className="sm:col-span-2">
            <Field label="Address (optional)" value={[client?.address, client?.city].filter(Boolean).join(", ") || "—"} icon={MapPin} />
          </div>
        </div>

        {/* Contract value + FY */}
        <div className="flex items-end gap-4 mt-4 pt-4 border-t border-border flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs font-medium text-muted-foreground mb-1">Contract Value</div>
            <div className="text-2xl font-bold text-foreground">{formatMoney(event.contract_value || 0, currency)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Financial Year</div>
            <div className="text-sm font-semibold text-foreground px-3 py-1.5 bg-muted/50 rounded-md border border-border">
              {(() => {
                const r = fyRange(currentFY());
                if (!r) return "—";
                const s = r.start.split("-");
                const e = r.end.split("-");
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${months[Number(s[1]) - 1]} ${s[0]} - ${months[Number(e[1]) - 1]} ${e[0]} (Current)`;
              })()}
            </div>
          </div>
        </div>
      </Card>

      {/* Financial summary cards */}
      <EventFinancialCards
        received={fin.received}
        paid={fin.teamPaid}
        leftBalance={Math.max(0, fin.pending)}
        profit={fin.profit}
        currency={currency}
      />

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={addToCalendar}>
          <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
        </Button>
        {fin.pending > 0 && (
          <Button size="sm" variant="outline" onClick={remindClient}>
            <Share2 className="w-3.5 h-3.5" /> Remind client about {formatMoney(fin.pending, currency)} due
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial",
              tab === t
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Schedule" && (
        <div className="space-y-3">
          {(() => {
            const dates = event.event_dates?.length ? event.event_dates : (event.start_date ? [event.start_date] : []);
            if (dates.length === 0) {
              return (
                <Card className="p-6">
                  <EmptyState
                    title="No shoot days"
                    description={`Edit the ${term.workItemSingular.toLowerCase()} to set a date range and select shoot days.`}
                    action={<Button size="sm" onClick={() => setShowForm(true)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>}
                  />
                </Card>
              );
            }
            const thisEventDayAsgns = dayAssignments.filter((a) => a.event_id === event.id);
            const otherDayAsgns = dayAssignments.filter((a) => a.event_id !== event.id);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {dates.slice().sort().map((d) => (
                  <DayScheduleCard
                    key={d}
                    event={event}
                    date={d}
                    workspaceId={workspaceId}
                    members={members}
                    services={services}
                    dayAssignments={thisEventDayAsgns}
                    otherDayAssignments={otherDayAsgns}
                    blockDates={blockDates}
                    onChanged={load}
                  />
                ))}
              </div>
            );
          })()}
        </div>
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
                    <div className="text-xs text-muted-foreground">{t.transaction_date} · {t.payment_method}</div>
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

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
          <FileText className="w-4 h-4" /> Create Quotation
        </Button>
      </div>

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
    </div>
  );
}

function Field({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        {value}
      </div>
    </div>
  );
}

function DateChip({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
      <Calendar className="w-3.5 h-3.5" />
      {day} {month}
    </span>
  );
}

function TeamStatCard({ label, value, tone = "default" }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn(
        "text-base font-bold mt-1 tabular-nums",
        tone === "warning" ? "text-warning" : "text-foreground"
      )}>{value}</div>
    </div>
  );
}