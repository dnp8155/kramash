import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Pencil,
  CalendarDays,
  StickyNote,
  Users,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import ClientForm from "@/components/clients/ClientForm";
import { formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    Promise.all([
      base44.entities.Client.get(id).catch(() => null),
      base44.entities.Event
        .filter({ client_id: id }, "-start_date", 200)
        .catch(() => []),
    ])
      .then(([c, evs]) => {
        if (!active) return;
        if (!c) {
          setNotFound(true);
        } else {
          setClient(c);
          setEvents(evs || []);
        }
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
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
        <Card>
          <LoadingState label="Loading client…" />
        </Card>
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
        <Card>
          <EmptyState
            title="Client not found"
            description="This client may have been removed or you don't have access to it."
            icon={Users}
          />
        </Card>
      </div>
    );
  }

  const handleSave = async (data) => {
    const updated = await base44.entities.Client.update(client.id, data);
    setClient(updated);
    toast({ title: "Client updated" });
  };

  const location = [client.city, client.state, client.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Link>

      <PageHeader
        title={client.name}
        description={`${events.length} event${events.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit Client
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 text-sm">
            {client.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {client.phone}
              </p>
            )}
            {client.alternate_phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {client.alternate_phone}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {client.email}
              </p>
            )}
            {(client.address || location) && (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4" />
                <span>{[client.address, location].filter(Boolean).join(", ")}</span>
              </p>
            )}
            {client.notes && (
              <div className="border-t border-border pt-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                <p className="text-foreground">{client.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Events</CardTitle>
            <span className="text-sm text-muted-foreground">
              {events.length} total
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {events.length === 0 ? (
              <EmptyState
                title="No events yet"
                description="Create an event for this client to get started."
                icon={CalendarDays}
              />
            ) : (
              <div className="divide-y divide-border">
                {events.map((ev) => (
                  <Link
                    to={`/events/${ev.id}`}
                    key={ev.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {ev.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ev.event_type} · {ev.venue || "—"}
                      </p>
                    </div>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {formatDate(ev.start_date)}
                    </span>
                    <StatusBadge status={ev.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ClientForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        onSave={handleSave}
      />
    </div>
  );
}