import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Pencil,
  CalendarDays,
  StickyNote,
  Users,
  Wallet,
  Archive,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import { useEvents } from "@/hooks/useEvents";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { deriveTeamStatus } from "@/utils/finance";
import RecordTeamPaymentModal from "@/components/finance/RecordTeamPaymentModal";
import { formatCurrency, formatDate, initials } from "@/utils/format";
import { todayStr } from "@/utils/team";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function TeamMemberDetail() {
  const { id } = useParams();
  const { roles } = useTeamRoles();
  const { assignments } = useEventTeamAssignments();
  const { events } = useEvents();
  const { transactions, createTransaction } = useFinancialTransactions({
    teamMemberId: id,
  });

  const paidByAssignment = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.status === "ACTIVE" && t.transaction_type === "TEAM_PAYMENT")
      .forEach((t) => {
        map[t.team_assignment_id] =
          (map[t.team_assignment_id] || 0) + (Number(t.amount) || 0);
      });
    return map;
  }, [transactions]);

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payAssignmentId, setPayAssignmentId] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    base44.entities.TeamMember
      .get(id)
      .then((m) => {
        if (!active) return;
        if (!m) setNotFound(true);
        else setMember(m);
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

  const eventMap = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e])),
    [events]
  );

  const myAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.team_member_id === id && a.assignment_status === "Assigned"
      ),
    [assignments, id]
  );

  const { upcoming, past } = useMemo(() => {
    const today = todayStr();
    const enriched = myAssignments
      .map((a) => ({ assignment: a, event: eventMap[a.event_id] }))
      .filter((x) => x.event);
    const upcoming = enriched
      .filter(({ event }) => (event.end_date || event.start_date) >= today)
      .sort((a, b) => a.event.start_date.localeCompare(b.event.start_date));
    const past = enriched
      .filter(({ event }) => (event.end_date || event.start_date) < today)
      .sort((a, b) => b.event.start_date.localeCompare(a.event.start_date));
    return { upcoming, past };
  }, [myAssignments, eventMap]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/team"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Team
        </Link>
        <Card>
          <LoadingState label="Loading team member…" />
        </Card>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/team"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Team
        </Link>
        <Card>
          <EmptyState
            title="Team member not found"
            description="This member may have been removed or you don't have access."
            icon={Users}
          />
        </Card>
      </div>
    );
  }

  const roleName =
    roles.find((r) => r.id === member.role_id)?.name || member.profession || "—";
  const role = roles.find((r) => r.id === member.role_id);
  const displayRate = role?.default_rate ?? member.default_rate;
  const displayRateType = role?.rate_type ?? member.rate_type;

  const handleSave = async (data) => {
    const updated = await base44.entities.TeamMember.update(member.id, data);
    setMember(updated);
    toast({ title: "Team member updated" });
  };

  const handleArchive = async () => {
    const updated = await base44.entities.TeamMember.update(member.id, {
      status: "Inactive",
    });
    setMember(updated);
    toast({ title: "Member archived", description: "Set to Inactive." });
  };

  const totalEarnings = myAssignments.reduce(
    (sum, a) => sum + (a.agreed_rate || 0),
    0
  );
  const totalPaid = myAssignments.reduce(
    (sum, a) => sum + (paidByAssignment[a.id] || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/team"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Team
      </Link>

      <PageHeader
        title={member.name}
        description={roleName}
        actions={
          <div className="flex items-center gap-2">
            {member.status === "Active" && (
              <Button variant="outline" onClick={handleArchive}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {initials(member.name)}
              </div>
              <StatusBadge status={member.status} />
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">{roleName}</p>
              {member.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {member.phone}
                </p>
              )}
              {member.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {member.email}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />{" "}
                {displayRate != null
                  ? `${formatCurrency(displayRate)} / ${displayRateType || "Per Event"}`
                  : "—"}
              </p>
            </div>
            {member.notes && (
              <div className="border-t border-border pt-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                <p className="text-foreground">{member.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Assignments</CardTitle>
            <span className="text-sm text-muted-foreground">
              {myAssignments.length} total · {formatCurrency(totalEarnings)} agreed ·{" "}
              {formatCurrency(totalPaid)} paid
            </span>
          </CardHeader>
          <CardBody className="p-0">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Upcoming ({upcoming.length})
              </p>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming events"
                description="This member has no upcoming assignments."
                icon={CalendarDays}
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map(({ assignment, event }) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    event={event}
                    paid={paidByAssignment[assignment.id] || 0}
                    onPay={() => {
                      setPayAssignmentId(assignment.id);
                      setPayOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Past ({past.length})
              </p>
            </div>
            {past.length === 0 ? (
              <EmptyState
                title="No past events"
                description="No completed assignments yet."
                icon={CalendarDays}
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-border">
                {past.map(({ assignment, event }) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    event={event}
                    paid={paidByAssignment[assignment.id] || 0}
                    onPay={() => {
                      setPayAssignmentId(assignment.id);
                      setPayOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <RecordTeamPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        assignments={myAssignments}
        members={[member]}
        preselectedAssignmentId={payAssignmentId}
        onSubmit={async (data) => {
          await createTransaction(data);
          toast({ title: "Payment recorded" });
        }}
      />
      <TeamMemberForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        roles={roles}
        onSave={handleSave}
      />
    </div>
  );
}

function AssignmentRow({ assignment, event, paid = 0, onPay }) {
  const agreed = Number(assignment.agreed_rate) || 0;
  const remaining = Math.max(0, agreed - paid);
  const status = deriveTeamStatus(paid, agreed);
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
      <Link to={`/events/${event.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground hover:text-primary">
          {event.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {assignment.role_name_snapshot || event.event_type} · {event.venue || "—"}
        </p>
      </Link>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {formatDate(event.start_date)}
      </span>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Agreed {formatCurrency(agreed)}</p>
        <p className="text-xs font-medium text-foreground">Paid {formatCurrency(paid)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Remaining</p>
        <p className={`text-xs font-semibold ${remaining > 0 ? "text-warning" : "text-foreground"}`}>
          {formatCurrency(remaining)}
        </p>
      </div>
      <StatusBadge status={status} />
      <Button size="sm" variant="outline" onClick={onPay}>
        <Wallet className="h-3.5 w-3.5" /> Pay
      </Button>
    </div>
  );
}