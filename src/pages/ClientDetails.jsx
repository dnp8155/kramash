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
import PortalAccessSection from "@/components/clients/PortalAccessSection";
import { formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Calendar, ArrowRight, StickyNote, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useToast } from "@/components/ui/use-toast";

export default function ClientDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();

  const [showForm, setShowForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleInvitePortal = async () => {
    if (!client?.email) {
      toast({ title: "Client email required", description: "Add an email address to this client first.", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const res = await base44.functions.invoke("inviteClientToPortal", {
        client_id: client.id,
        workspace_id: workspaceId,
        email: client.email
      });
      const d = res?.data || res;
      setInvited(true);
      setInviteResult(d);
      if (d?.email_sent) {
        toast({
          title: "Invitation email sent!",
          description: "The client will receive an email with a link to set their password."
        });
      } else {
        toast({
          title: "Invitation link ready",
          description: "Share the registration link below with your client via WhatsApp or SMS."
        });
      }
    } catch (e) {
      toast({
        title: "Failed to invite client",
        description: e?.message || e?.data?.error || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteResult?.register_url) return;
    navigator.clipboard.writeText(inviteResult.register_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/clients")} className="-ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleInvitePortal}
            disabled={inviting}
          >
            {invited ? (
              <><CheckCircle2 className="w-4 h-4 text-success" /> Invite Sent</>
            ) : inviting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Inviting…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Invite to Portal</>
            )}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Pencil className="w-4 h-4" /> Edit Client
          </Button>
        </div>
      </div>

      {/* Registration link sharing panel — shown after invite if email wasn't sent */}
      {invited && inviteResult && !inviteResult.email_sent && (
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide pt-0.5">Share Invitation Link</div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            The email couldn't be sent automatically. Copy this link and share it with your client (via WhatsApp, SMS, etc.).
            Their email is already pre-filled — they just need to set a password.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteResult.register_url || ""}
              className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground"
              onClick={(e) => e.target.select()}
            />
            <Button size="sm" onClick={copyInviteLink} className="shrink-0">
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : "Copy Link"}
            </Button>
          </div>
        </Card>
      )}

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

      {/* Quick Portal Access (password-only gate) */}
      <PortalAccessSection client={client} workspaceId={workspaceId} />

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