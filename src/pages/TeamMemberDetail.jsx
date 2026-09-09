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
import { formatCurrency, formatDate, initials } from "@/utils/format";
import { todayStr } from "@/utils/team";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function TeamMemberDetail() {
  const { id } = useParams();
  const { roles } = useTeamRoles();
  const { assignments } = useEventTeamAssignments();
  const { events } = useEvents();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
                {member.default_rate != null
                  ? `${formatCurrency(member.default_rate)} / ${member.rate_type}`
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
              {myAssignments.length} total · {formatCurrency(totalEarnings)} agreed
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
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

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

function AssignmentRow({ assignment, event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {event.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {assignment.role_name_snapshot || event.event_type} · {event.venue || "—"}
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {formatDate(event.start_date)}
      </span>
      <span className="text-sm font-medium text-foreground">
        {assignment.agreed_rate != null
          ? formatCurrency(assignment.agreed_rate)
          : "—"}
      </span>
      <StatusBadge status={event.status} />
    </Link>
  );
}