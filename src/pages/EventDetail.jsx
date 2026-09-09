import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Phone,
  Mail,
  Pencil,
  UserPlus,
  FileText,
  StickyNote,
  Trash2,
  Loader2,
  Wallet,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import EventForm from "@/components/events/EventForm";
import AssignTeamModal from "@/components/team/AssignTeamModal";
import EventFinancialSummary from "@/components/finance/EventFinancialSummary";
import TransactionActivityTable from "@/components/finance/TransactionActivityTable";
import RecordClientPaymentModal from "@/components/finance/RecordClientPaymentModal";
import RecordTeamPaymentModal from "@/components/finance/RecordTeamPaymentModal";
import RecordExpenseModal from "@/components/finance/RecordExpenseModal";
import EditTransactionModal from "@/components/finance/EditTransactionModal";
import EventReminders from "@/components/events/EventReminders";
import { useEvents } from "@/hooks/useEvents";
import { useClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useFinancialYear } from "@/lib/FinancialYearContext";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { computeEventFinancials } from "@/utils/finance";
import { formatDate, formatCurrency, initials } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function EventDetail() {
  const { id } = useParams();
  const { events, updateEvent } = useEvents();
  const { clients, createClient } = useClients();
  const { members } = useTeamMembers();
  const { roles } = useTeamRoles();
  const { assignments, createAssignment, removeAssignment } =
    useEventTeamAssignments();
  const { categories } = useExpenseCategories();
  const t = useBusinessTerminology();
  const { financialYears } = useFinancialYear();
  const {
    transactions,
    createTransaction,
    updateTransaction,
    voidTransaction,
    unvoidTransaction,
  } = useFinancialTransactions({ eventId: id });

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [clientPayOpen, setClientPayOpen] = useState(false);
  const [teamPayOpen, setTeamPayOpen] = useState(false);
  const [payAssignmentId, setPayAssignmentId] = useState(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    base44.entities.Event
      .get(id)
      .then((ev) => {
        if (!active) return;
        if (!ev) setNotFound(true);
        else setEvent(ev);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const client = clients.find((c) => c.id === event?.client_id);

  const eventAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.event_id === id && a.assignment_status === "Assigned"
      ),
    [assignments, id]
  );

  const existingMemberIds = eventAssignments.map((a) => a.team_member_id);

  const fin = useMemo(
    () =>
      computeEventFinancials({
        transactions,
        event,
        assignments: eventAssignments,
      }),
    [transactions, event, eventAssignments]
  );

  const paidByAssignment = useMemo(
    () =>
      Object.fromEntries(
        fin.assignmentPayments.map((ap) => [ap.assignment.id, ap])
      ),
    [fin]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card>
          <LoadingState label={`Loading ${t.workItemSingular.toLowerCase()}…`} />
        </Card>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Card>
          <EmptyState
            title={`${t.workItemSingular} not found`}
            description={`This ${t.workItemSingular.toLowerCase()} may have been removed or you don't have access to it.`}
            icon={CalendarDays}
          />
        </Card>
      </div>
    );
  }

  const dateLabel = event.end_date
    ? `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`
    : formatDate(event.start_date);

  const handleSave = async (data) => {
    const updated = await updateEvent(event.id, data);
    setEvent(updated);
    toast({ title: `${t.workItemSingular} updated` });
  };

  const handleEditContractValue = async (value) => {
    const updated = await updateEvent(event.id, { contract_value: value });
    setEvent(updated);
    toast({ title: "Contract value updated" });
  };

  const handleAssign = async (data) => {
    await createAssignment({ ...data, event_id: event.id });
    toast({ title: "Team member assigned" });
  };

  const handleRemove = async (assignmentId) => {
    setRemovingId(assignmentId);
    try {
      await removeAssignment(assignmentId);
      toast({ title: "Team member removed" });
    } catch (e) {
      toast({ title: "Remove failed", description: e?.message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleCreateTxn = async (data) => {
    await createTransaction(data);
    toast({ title: "Transaction recorded" });
  };

  const handleEditTxn = async (data) => {
    await updateTransaction(editing.id, data);
    toast({ title: "Transaction updated" });
  };

  const openPayFor = (assignmentId) => {
    setPayAssignmentId(assignmentId);
    setTeamPayOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <PageHeader
        title={event.title}
        description={`${event.event_type} · ${dateLabel}`}
        actions={
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> {t.editWorkItemLabel}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t.workItemDetailsLabel}</CardTitle>
            <StatusBadge status={event.status} />
          </CardHeader>
          <CardBody className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> {dateLabel}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>
                {event.venue || "—"}
                {event.venue_address && (
                  <span className="text-muted-foreground/70">
                    {" · "}
                    {event.venue_address}
                  </span>
                )}
              </span>
            </div>
            {event.description && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-foreground">{event.description}</p>
              </div>
            )}
            {event.notes && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                <p className="text-foreground">{event.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 text-sm">
            {client ? (
              <>
                <Link
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-2 font-semibold text-foreground hover:text-primary"
                >
                  <Users className="h-4 w-4" /> {client.name}
                </Link>
                {client.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {client.phone}
                  </p>
                )}
                {client.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {client.email}
                  </p>
                )}
                {(client.city || client.state) && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />{" "}
                    {[client.city, client.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Client not found.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Team</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Team cost: {formatCurrency(fin.teamAgreed)}
              </span>
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-4 w-4" /> Assign Team
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {eventAssignments.length === 0 ? (
              <EmptyState
                title={`No team assigned to this ${t.workItemSingular.toLowerCase()} yet`}
                description={`Assign team members to this ${t.workItemSingular.toLowerCase()}.`}
                icon={Users}
                action={
                  <Button onClick={() => setAssignOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Assign Team
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {eventAssignments.map((a) => {
                  const member = members.find((m) => m.id === a.team_member_id);
                  const ap = paidByAssignment[a.id];
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {member ? initials(member.name) : "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member ? member.name : "Unknown member"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.role_name_snapshot || "—"}
                          {a.rate_type ? ` · ${a.rate_type}` : ""}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-muted-foreground">
                          Agreed {formatCurrency(a.agreed_rate)}
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          Paid {formatCurrency(ap?.paid || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p
                          className={`text-xs font-semibold ${
                            (ap?.remaining || 0) > 0 ? "text-warning" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(ap?.remaining || 0)}
                        </p>
                      </div>
                      <StatusBadge status={ap?.status || "Unpaid"} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPayFor(a.id)}
                      >
                        <Wallet className="h-3.5 w-3.5" /> Pay
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(a.id)}
                        disabled={removingId === a.id}
                        title="Remove from event"
                      >
                        {removingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <EventReminders event={event} />
          <EventFinancialSummary
            fin={fin}
            onEditContractValue={handleEditContractValue}
            onRecordClientPayment={() => setClientPayOpen(true)}
            onRecordExpense={() => setExpenseOpen(true)}
          />

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {transactions.length === 0 ? (
                <EmptyState
                  title="No payments recorded"
                  description={`Record client payments, team payments, and expenses for this ${t.workItemSingular.toLowerCase()}.`}
                  icon={Wallet}
                />
              ) : (
                <TransactionActivityTable
                  transactions={transactions}
                  events={[event]}
                  clients={clients}
                  members={members}
                  categories={categories}
                  financialYears={financialYears}
                  onEdit={(t) => setEditing(t)}
                  onVoid={async (t) => {
                    await voidTransaction(t.id);
                    toast({ title: "Transaction voided" });
                  }}
                  onUnvoid={async (t) => {
                    await unvoidTransaction(t.id);
                    toast({ title: "Transaction restored" });
                  }}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> {t.editWorkItemLabel}
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Team
          </Button>
          <Button variant="outline" onClick={() => setClientPayOpen(true)}>
            <Wallet className="h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" onClick={() => setExpenseOpen(true)}>
            <FileText className="h-4 w-4" /> Add Expense
          </Button>
          <Link to="/quotation/new">
            <Button variant="outline">
              <FileText className="h-4 w-4" /> Create Quotation
            </Button>
          </Link>
        </CardBody>
      </Card>

      <EventForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        event={event}
        clients={clients}
        onSave={handleSave}
        onCreateClient={createClient}
      />

      <AssignTeamModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        event={event}
        members={members}
        roles={roles}
        assignments={assignments}
        events={events}
        existingMemberIds={existingMemberIds}
        onAssign={handleAssign}
      />

      <RecordClientPaymentModal
        open={clientPayOpen}
        onClose={() => setClientPayOpen(false)}
        event={event}
        clients={clients}
        onSubmit={handleCreateTxn}
      />
      <RecordTeamPaymentModal
        open={teamPayOpen}
        onClose={() => setTeamPayOpen(false)}
        event={event}
        assignments={eventAssignments}
        members={members}
        preselectedAssignmentId={payAssignmentId}
        onSubmit={handleCreateTxn}
      />
      <RecordExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        event={event}
        categories={categories}
        onSubmit={handleCreateTxn}
      />
      <EditTransactionModal
        open={!!editing}
        onClose={() => setEditing(null)}
        transaction={editing}
        onSubmit={handleEditTxn}
      />
    </div>
  );
}

function BackLink() {
  const t = useBusinessTerminology();
  return (
    <Link
      to="/events"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to {t.workItemPlural}
    </Link>
  );
}