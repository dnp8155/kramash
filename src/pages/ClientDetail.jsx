import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
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
import ClientFinancialSummary from "@/components/clients/ClientFinancialSummary";
import ClientPaymentHistory from "@/components/clients/ClientPaymentHistory";
import DeleteClientModal from "@/components/clients/DeleteClientModal";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { formatDate, formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const STATUS_SORT = {
  "In Progress": 0,
  Pending: 1,
  Confirmed: 1,
  Completed: 2,
  Cancelled: 3,
};

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const pa = STATUS_SORT[a.status] ?? 4;
    const pb = STATUS_SORT[b.status] ?? 4;
    if (pa !== pb) return pa - pb;
    return (b.start_date || "").localeCompare(a.start_date || "");
  });
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useBusinessTerminology();
  const [client, setClient] = useState(null);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    Promise.all([
      base44.entities.Client.get(id).catch(() => null),
      base44.entities.Event.filter({ client_id: id }, "-start_date", 200).catch(() => []),
      base44.entities.FinancialTransaction.filter({ client_id: id }, "-transaction_date", 500).catch(() => []),
    ])
      .then(([c, evs, txns]) => {
        if (!active) return;
        if (!c) {
          setNotFound(true);
        } else {
          setClient(c);
          setEvents(evs || []);
          setTransactions(txns || []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const financials = useMemo(() => {
    const activeEvents = events.filter((e) => e.status !== "Cancelled");
    const totalEvents = events.length;
    const contractValue = activeEvents.reduce(
      (s, e) => s + (Number(e.contract_value) || 0),
      0
    );
    const receipts = transactions.filter(
      (t) => t.status === "ACTIVE" && t.transaction_type === "CLIENT_RECEIPT"
    );
    const received = receipts.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outstanding = activeEvents.reduce((s, e) => {
      const eventReceived = receipts
        .filter((t) => t.event_id === e.id)
        .reduce((rs, t) => rs + (Number(t.amount) || 0), 0);
      return s + Math.max(0, (Number(e.contract_value) || 0) - eventReceived);
    }, 0);
    return { totalEvents, contractValue, received, outstanding, receipts };
  }, [events, transactions]);

  const sortedEvents = useMemo(() => sortEvents(events), [events]);

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
    toast({ title: "Client updated successfully." });
  };

  const handleDeleted = () => {
    setDeleteOpen(false);
    navigate("/clients");
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
        description={`${financials.totalEvents} ${t.workItemSingular.toLowerCase()}${financials.totalEvents === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {client.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = `tel:${client.phone}`)}
              >
                <Phone className="h-4 w-4" /> Call
              </Button>
            )}
            {client.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = `mailto:${client.email}`)}
              >
                <Mail className="h-4 w-4" /> Email
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <ClientFinancialSummary
        totalEvents={financials.totalEvents}
        contractValue={financials.contractValue}
        received={financials.received}
        outstanding={financials.outstanding}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
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
            <CardTitle>{t.clientWorkLabel}</CardTitle>
            <span className="text-sm text-muted-foreground">{events.length} total</span>
          </CardHeader>
          <CardBody className="p-0">
            {events.length === 0 ? (
              <EmptyState
                title={`No ${t.workItemPlural.toLowerCase()} yet`}
                description={`This client has no ${t.workItemPlural.toLowerCase()} or projects yet.`}
                icon={CalendarDays}
              />
            ) : (
              <div className="divide-y divide-border">
                {sortedEvents.map((ev) => (
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
                        {ev.event_type || "—"} · {ev.venue || "—"}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.start_date)}
                      </p>
                      {ev.contract_value > 0 && (
                        <p className="text-xs font-medium text-foreground">
                          {formatCurrency(ev.contract_value)}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={ev.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ClientPaymentHistory payments={financials.receipts} events={events} />

      <ClientForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        onSave={handleSave}
      />
      <DeleteClientModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        client={client}
        onDeleted={handleDeleted}
      />
    </div>
  );
}