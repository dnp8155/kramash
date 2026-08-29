import { useState, useEffect, useCallback } from "react";
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
import ClientForm from "@/components/clients/ClientForm";
import ClientFinancialSummary from "@/components/clients/ClientFinancialSummary";
import { formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Calendar, ArrowRight, StickyNote } from "lucide-react";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { invalidateEntities } from "@/lib/queryInvalidation";

export default function ClientDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();

  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["client", id, workspaceId],
    queryFn: async () => {
      const cl = await base44.entities.Client.get(id);
      if (!cl || cl.workspace_id !== workspaceId) return { notFound: true };
      const evList = await base44.entities.Event.filter({ workspace_id: workspaceId, client_id: id }, "-start_date", 200);
      const evIds = (evList || []).map((e) => e.id);
      let tx = [];
      if (evIds.length > 0) {
        try {
          tx = await base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId }, "-transaction_date", 1000);
          tx = (tx || []).filter((t) => evIds.includes(t.event_id));
        } catch (e) { tx = []; }
      }
      return { notFound: false, client: cl, events: evList || [], transactions: tx || [] };
    },
    enabled: !!id && !!workspaceId
  });
  const client = data?.client || null;
  const events = data?.events || [];
  const transactions = data?.transactions || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["client", id, workspaceId] });
    invalidateEntities(queryClient, ["Client", "Event", "FinancialTransaction"]);
  };

  if (isLoading) return <DetailSkeleton />;

  if (hasError) {
    return (
      <DetailErrorState
        title="Failed to load"
        description={error?.message || "Something went wrong. Please try again."}
        onBack={() => navigate("/clients")}
        onRetry={load}
        backLabel="Back to Clients"
      />
    );
  }

  if (notFound || !client) {
    return (
      <DetailErrorState
        title="Client not found"
        description="This client may not exist or you don't have access to it."
        onBack={() => navigate("/clients")}
        backLabel="Back to Clients"
      />
    );
  }

  const address = [client.address, client.city, client.state, client.country].filter(Boolean).join(", ");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/clients")} className="-ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Pencil className="w-4 h-4" /> Edit Client
        </Button>
      </div>

      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
          {client.alternate_phone && <InfoRow icon={Phone} label="Alternate Phone" value={client.alternate_phone} />}
          {client.email && <InfoRow icon={Mail} label="Email" value={client.email} />}
          {address && <InfoRow icon={MapPin} label="Address" value={address} />}
        </div>
        {client.notes && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </Card>

      {/* Client 360° financial summary */}
      <ClientFinancialSummary events={events} transactions={transactions} currency={workspace?.currency || "INR"} />

      {/* Related events */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {term.clientWorkLabel} ({events.length})
          </div>
        </div>
        {events.length === 0 ? (
          <EmptyState title={`No ${term.workItemPlural.toLowerCase()} yet`} description={`Create a ${term.workItemSingular.toLowerCase()} for this client to see it here.`} />
        ) : (
          <div className="divide-y divide-border">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/events/${e.id}`)}
                className="w-full flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded text-left"
              >
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.event_type} · {formatEventDate(e.start_date, e.end_date)}{e.venue ? ` · ${e.venue}` : ""}</div>
                </div>
                <StatusBadge status={e.status} />
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <ClientForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        client={client}
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