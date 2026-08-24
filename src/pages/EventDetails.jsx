import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EventForm from "@/components/events/EventForm";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { formatEventDate } from "@/lib/dates";
import { ArrowLeft, Pencil, Wallet, FileText, Users, MapPin, Calendar, Phone, Mail } from "lucide-react";

export default function EventDetails() {
  const { id } = useParams();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      if (ev.client_id) {
        try {
          const cl = await base44.entities.Client.get(ev.client_id);
          if (cl && cl.workspace_id === workspaceId) setClient(cl);
        } catch (e) { setClient(null); }
      }
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, workspaceId]);

  useEffect(() => { load(); }, [load]);

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

  const financeCards = [
    { label: "Contract" }, { label: "Received" }, { label: "Paid" }, { label: "Left" }, { label: "Profit" }
  ];

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
              <Link to={`/clients/${client.id}`} className="text-base font-semibold text-primary hover:underline">
                {client.name}
              </Link>
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

        {/* Team card — placeholder until Phase 4 */}
        <Card className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Team</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            No team assigned yet. Team management arrives in Phase 4.
          </div>
        </Card>
      </div>

      {/* Financial cards — placeholder until Phase 5 */}
      <Card className="p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financials</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {financeCards.map((c) => (
            <div key={c.label} className="bg-muted/40 border border-border rounded-md px-3 py-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</div>
              <div className="text-sm font-semibold mt-0.5 text-muted-foreground">—</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Financial tracking available in Phase 5.</p>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowForm(true)}>
          <Pencil className="w-4 h-4" /> Edit Event
        </Button>
        <Button variant="outline" disabled className="opacity-60 cursor-not-allowed" title="Available in Phase 5">
          <Wallet className="w-4 h-4" /> Record Payment
        </Button>
        <Button variant="outline" disabled className="opacity-60 cursor-not-allowed" title="Available in Phase 6">
          <FileText className="w-4 h-4" /> Create Quotation
        </Button>
        <Button variant="outline" disabled className="opacity-60 cursor-not-allowed" title="Available in Phase 4">
          <Users className="w-4 h-4" /> Add Team
        </Button>
      </div>

      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
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