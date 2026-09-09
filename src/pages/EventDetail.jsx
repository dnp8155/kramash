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
  Wallet,
  FileText,
  StickyNote,
  Trash2,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import EventForm from "@/components/events/EventForm";
import AssignTeamModal from "@/components/team/AssignTeamModal";
import { useEvents } from "@/hooks/useEvents";
import { useClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
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

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

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

  const teamCost = eventAssignments.reduce(
    (sum, a) => sum + (a.agreed_rate || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>
        <Card>
          <LoadingState label="Loading event…" />
        </Card>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>
        <Card>
          <EmptyState
            title="Event not found"
            description="This event may have been removed or you don't have access to it."
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
    toast({ title: "Event updated" });
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

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Events
      </Link>

      <PageHeader
        title={event.title}
        description={`${event.event_type} · ${dateLabel}`}
        actions={
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit Event
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Event Details</CardTitle>
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
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Description
                </p>
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
                Team cost: {formatCurrency(teamCost)}
              </span>
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-4 w-4" /> Assign Team
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {eventAssignments.length === 0 ? (
              <EmptyState
                title="No team assigned to this event yet"
                description="Assign photographers, cinematographers, and crew to this event."
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
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-5 py-3.5"
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
                      <span className="text-sm font-medium text-foreground">
                        {a.agreed_rate != null ? formatCurrency(a.agreed_rate) : "—"}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        Paid: {formatCurrency(0)}
                      </span>
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

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardBody>
            <EmptyState
              title="No payments recorded"
              description="Payments & billing arrive in Phase 5."
              icon={Wallet}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit Event
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Team
          </Button>
          <Button variant="outline" disabled title="Available in Phase 5">
            <Wallet className="h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" disabled title="Available in Phase 6">
            <FileText className="h-4 w-4" /> Create Quotation
          </Button>
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
    </div>
  );
}