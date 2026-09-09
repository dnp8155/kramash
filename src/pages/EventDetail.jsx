import { useEffect, useState } from "react";
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
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import EventForm from "@/components/events/EventForm";
import { useEvents } from "@/hooks/useEvents";
import { useClients } from "@/hooks/useClients";
import { formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function EventDetail() {
  const { id } = useParams();
  const { updateEvent } = useEvents();
  const { clients, createClient } = useClients();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    base44.entities.Event.get(id)
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

  const client = clients.find((c) => c.id === event.client_id);
  const dateLabel = event.end_date
    ? `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`
    : formatDate(event.start_date);

  const handleSave = async (data) => {
    const updated = await updateEvent(event.id, data);
    setEvent(updated);
    toast({ title: "Event updated" });
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
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardBody>
            <EmptyState
              title="No team assigned yet"
              description="Team management & assignment arrives in Phase 4."
              icon={Users}
            />
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
          <Button variant="outline" disabled title="Available in Phase 4">
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
    </div>
  );
}