import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import EventForm from "@/components/events/EventForm";
import AssignTeamDialog from "@/components/team/AssignTeamDialog";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import { useToast } from "@/components/ui/use-toast";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { formatEventDate } from "@/lib/dates";
import { formatINR, formatMoney } from "@/utils/format";
import { eventTeamCost } from "@/lib/teamService";
import {
  eventFinancialSummary,
  assignmentPaid,
  clientPaymentStatus,
  teamPaymentStatus,
  loadExpenseCategories
} from "@/lib/financeService";
import { ArrowLeft, Pencil, Wallet, FileText, Users, MapPin, Calendar, Phone, Mail, Trash2, Plus, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EventDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState(null);
  const [client, setClient] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [eventsById, setEventsById] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showTeamPayment, setShowTeamPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [teamPayAssignment, setTeamPayAssignment] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const ev = await base44.entities.Event.get(id);
      if (!ev || ev.workspace_id !== workspaceId) {
        setNotFound(true);
        return;
      }
      setEvent(ev);
      const [clList, membs, rles, asgns, tx, cats] = await Promise.all([
        ev.client_id ? base44.entities.Client.get(ev.client_id).catch(() => null) : Promise.resolve(null),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, event_id: ev.id }, "-transaction_date", 500),
        loadExpenseCategories(workspaceId)
      ]);
      if (clList && clList.workspace_id === workspaceId) setClient(clList);
      setMembers(membs || []);
      setRoles(rles || []);
      setAssignments(asgns || []);
      setTransactions(tx || []);
      setCategories(cats || []);
      // Build eventsById from all assignments for conflict detection.
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
      setEventsById(evMap);
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, workspaceId]);

  useEffect(() => { load(); }, [load]);

  const eventAssignments = useMemo(
    () => assignments.filter((a) => a.event_id === id && a.assignment_status !== "removed"),
    [assignments, id]
  );

  const membersById = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);

  const teamCost = useMemo(() => eventTeamCost(eventAssignments), [eventAssignments]);

  const fin = useMemo(
    () => eventFinancialSummary(event, transactions, eventAssignments),
    [event, transactions, eventAssignments]
  );
  const clientStatus = clientPaymentStatus(fin.received, fin.contractValue);
  const currency = workspace?.currency || "INR";

  const removeAssignment = async (a) => {
    try {
      await base44.entities.EventTeamAssignment.update(a.id, { assignment_status: "removed" });
      toast({ title: "Team member removed from event" });
      load();
    } catch (e) {
      toast({ title: "Failed to remove assignment", description: e?.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="p-6"><LoadingState label="Loading event…" /></div>;

  if (notFound || !event) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/events")} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Button>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">Event not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This event may not exist or you don't have access to it.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/events")} className="-ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Pencil className="w-4 h-4" /> Edit Event
        </Button>
      </div>

      {/* Event header */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full shrink-0 ${EVENT_STATUS[event.status]?.dot}`} />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{event.title}</h1>
              <p className="text-sm text-muted-foreground">{event.event_type}</p>
            </div>
          </div>
          <StatusBadge status={event.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <InfoRow icon={Calendar} label="Date(s)" value={formatEventDate(event.start_date, event.end_date)} />
          <InfoRow icon={MapPin} label="Venue" value={event.venue || "—"} />
          <div className="sm:col-span-2">
            <InfoRow icon={MapPin} label="Venue Address" value={event.venue_address || "—"} />
          </div>
        </div>

        {event.description && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}
        {event.notes && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client card */}
        <Card className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Client</div>
          {client ? (
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-base font-semibold text-primary hover:underline text-left"
              >
                {client.name}
              </button>
              {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
              {client.email && <InfoRow icon={Mail} label="Email" value={client.email} />}
              {(client.city || client.address) && (
                <InfoRow icon={MapPin} label="Address" value={[client.address, client.city, client.state].filter(Boolean).join(", ") || "—"} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Client not available.</p>
          )}
        </Card>

        {/* Team card — real assignments */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Team ({eventAssignments.length})
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAssign(true)}>
              <Plus className="w-3.5 h-3.5" /> Assign
            </Button>
          </div>
          {eventAssignments.length === 0 ? (
            <EmptyState title="No team assigned yet" description="Assign team members to this event." />
          ) : (
            <div className="divide-y divide-border">
              {eventAssignments.map((a) => {
                const m = membersById[a.team_member_id];
                const paid = assignmentPaid(transactions, a.id);
                const remaining = Math.max(0, (Number(a.agreed_rate) || 0) - paid);
                const overpaid = paid > (Number(a.agreed_rate) || 0) ? paid - (Number(a.agreed_rate) || 0) : 0;
                const status = teamPaymentStatus(paid, Number(a.agreed_rate) || 0);
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {m?.name || "Unknown member"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.role_name_snapshot || m?.profession || "—"} · {a.rate_type}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">Agreed {formatMoney(a.agreed_rate, currency)}</div>
                      <div className="text-xs text-muted-foreground">Paid {formatMoney(paid, currency)}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
                        status === "Paid" ? "bg-success/10 text-success" :
                        status === "Overpaid" ? "bg-warning/10 text-warning" :
                        status === "Partial" ? "bg-amber-100 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {status}
                      </div>
                      {overpaid > 0 ? (
                        <div className="text-xs text-warning mt-0.5">Overpaid {formatMoney(overpaid, currency)}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-0.5">Rem {formatMoney(remaining, currency)}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setTeamPayAssignment(a)}
                      className="text-primary hover:text-primary-hover p-1"
                      aria-label="Record team payment"
                      title="Record payment"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeAssignment(a)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remove assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Financials — real summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financials</div>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide",
            clientStatus === "Paid" ? "bg-success/10 text-success" :
            clientStatus === "Overpaid" ? "bg-warning/10 text-warning" :
            clientStatus === "Partially Paid" ? "bg-amber-100 text-amber-700" :
            "bg-muted text-muted-foreground"
          )}>
            {clientStatus}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FinCell label="Contract Value" value={formatMoney(fin.contractValue, currency)} />
          <FinCell label="Received" value={formatMoney(fin.received, currency)} tone="success" />
          <FinCell label="Pending" value={formatMoney(fin.pending, currency)} tone={fin.pending > 0 ? "warning" : "muted"} />
          <FinCell label={fin.overpaid > 0 ? "Overpaid" : "Team Agreed"} value={fin.overpaid > 0 ? formatMoney(fin.overpaid, currency) : formatMoney(fin.teamAgreed, currency)} tone={fin.overpaid > 0 ? "warning" : "default"} />
          <FinCell label="Team Paid" value={formatMoney(fin.teamPaid, currency)} tone="destructive" />
          <FinCell label="Team Remaining" value={formatMoney(Math.max(0, fin.teamAgreed - fin.teamPaid), currency)} />
          <FinCell label="Expenses" value={formatMoney(fin.expenses, currency)} tone="destructive" />
          <FinCell label="Actual Profit" value={formatMoney(fin.profit, currency)} tone={fin.profit >= 0 ? "success" : "destructive"} />
        </div>
        {fin.overpaid > 0 && (
          <p className="mt-2 text-xs text-warning flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Client has overpaid by {formatMoney(fin.overpaid, currency)}.
          </p>
        )}
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowForm(true)}>
          <Pencil className="w-4 h-4" /> Edit Event
        </Button>
        <Button onClick={() => setShowAssign(true)}>
          <Users className="w-4 h-4" /> Add Team
        </Button>
        <Button onClick={() => setShowClientPayment(true)}>
          <Wallet className="w-4 h-4" /> Record Payment
        </Button>
        <Button variant="outline" onClick={() => setShowExpense(true)}>
          <Receipt className="w-4 h-4" /> Record Expense
        </Button>
        <Button variant="outline" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
          <FileText className="w-4 h-4" /> Create Quotation
        </Button>
      </div>

      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function FinCell({ label, value, tone = "default" }) {
  const toneClass = {
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    muted: "text-muted-foreground",
    default: "text-foreground"
  };
  return (
    <div className="bg-muted/40 border border-border rounded-md px-3 py-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-sm font-semibold mt-0.5", toneClass[tone])}>{value}</div>
    </div>
  );
}