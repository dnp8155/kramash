import { useState, useRef } from "react";
import { useT } from "@/hooks/useT";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import ClientDetailsSkeleton from "@/components/clients/ClientDetailsSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DetailErrorState from "@/components/common/DetailErrorState";
import ClientForm from "@/components/clients/ClientForm";
import ClientFinancialSummary from "@/components/clients/ClientFinancialSummary";
import PortalAccessSection from "@/components/clients/PortalAccessSection";
import { formatEventDates } from "@/lib/dates";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Calendar, ArrowRight, StickyNote, KeyRound, MessageCircle } from "lucide-react";
import { sanitizePhoneInput, whatsappNumber } from "@/lib/validation";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { invalidateEntities } from "@/lib/queryInvalidation";

export default function ClientDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();

  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const portalRef = useRef(null);

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
          tx = (tx || []).filter((x) => evIds.includes(x.event_id));
        } catch (e) { tx = []; }
      }
      return { notFound: false, client: cl, events: evList || [], transactions: tx || [] };
    },
    enabled: !!id && !!workspaceId
  });
  const client = data?.client || null;
  usePageTitle(client?.name || "Client");
  const events = data?.events || [];
  const transactions = data?.transactions || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["client", id, workspaceId] });
    invalidateEntities(queryClient, ["Client", "Event", "FinancialTransaction"]);
  };

  const handleGeneratePassword = () => {
    const section = document.getElementById("portal-access-section");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!client?.portal_access_enabled) {
      portalRef.current?.handleEnable();
    }
  };

  if (isLoading) return <ClientDetailsSkeleton />;

  if (hasError) {
    return (
      <DetailErrorState
        title={t("Failed to load")}
        description={error?.message || t("Something went wrong. Please try again.")}
        onBack={() => navigate("/clients")}
        onRetry={load}
        backLabel={t("Back to Clients")}
      />
    );
  }

  if (notFound || !client) {
    return (
      <DetailErrorState
        title={t("Client not found")}
        description={t("This client may not exist or you don't have access to it.")}
        onBack={() => navigate("/clients")}
        backLabel={t("Back to Clients")}
      />
    );
  }

  const address = [client.address, client.city, client.state, client.country].filter(Boolean).join(", ");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate("/clients")} className="hidden lg:inline-flex -ml-2 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </span>
          {t("Back to Clients")}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePassword}
          >
            <KeyRound className="w-4 h-4" />
            {client.portal_access_enabled ? t("Manage Portal") : t("Generate Password")}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Pencil className="w-4 h-4" /> {t("Edit Client")}
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {client.phone && (
            <InfoRow
              icon={Phone}
              label={t("Phone")}
              value={client.phone}
              actions={
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${sanitizePhoneInput(client.phone)}`}
                    className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-primary hover:bg-muted transition-colors"
                    aria-label={t("Call")}
                    title={t("Call")}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${whatsappNumber(client.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-success hover:bg-muted transition-colors"
                    aria-label="WhatsApp"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              }
            />
          )}
          {client.alternate_phone && <InfoRow icon={Phone} label={t("Alternate Phone")} value={client.alternate_phone} />}
          {client.email && <InfoRow icon={Mail} label={t("Email")} value={client.email} />}
          {address && <InfoRow icon={MapPin} label={t("Address")} value={address} />}
        </div>
        {client.notes && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              <StickyNote className="w-3.5 h-3.5" /> {t("Notes")}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </Card>

      {/* Quick Portal Access (password-only gate) */}
      <div id="portal-access-section">
        <PortalAccessSection ref={portalRef} client={client} workspaceId={workspaceId} />
      </div>

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
          <EmptyState title={`${t("No")} ${term.workItemPlural.toLowerCase()} ${t("yet")}`} description={`${t("Create a")} ${term.workItemSingular.toLowerCase()} ${t("for this client to see it here.")}`} />
        ) : (
          <div className="divide-y divide-border">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/events/${e.id}`)}
                className="w-full flex items-center gap-3 py-3.5 hover:bg-muted/40 -mx-2 px-2 rounded text-left"
              >
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.event_type} · {formatEventDates(e)}{e.venue ? ` · ${e.venue}` : ""}</div>
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

function InfoRow({ icon: Icon, label, value, actions }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm text-foreground break-words">{value}</span>
          {actions}
        </div>
      </div>
    </div>
  );
}