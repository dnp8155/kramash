import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useQuotations } from "@/hooks/useQuotations";
import { toast } from "@/components/ui/use-toast";
import {
  Link2, Copy, Eye, EyeOff, Loader2, ExternalLink, Power, Users,
} from "lucide-react";
const formatTimestamp = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function PortalManager({ quotationId, quotation, onUpdateQuotation }) {
  const { workspaceId } = useWorkspace();
  const { updateQuotation } = useQuotations();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [hidingNames, setHidingNames] = useState(false);

  useEffect(() => {
    if (!workspaceId || !quotationId) return;
    (async () => {
      setLoading(true);
      try {
        const portals = await base44.entities.QuotationPortal.filter({
          workspace_id: workspaceId,
          quotation_id: quotationId,
        });
        setPortal(portals?.[0] || null);
      } catch {
        setPortal(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, quotationId]);

  const generateToken = () => {
    return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = generateToken();
      const created = await base44.entities.QuotationPortal.create({
        workspace_id: workspaceId,
        quotation_id: quotationId,
        public_token: token,
        is_enabled: true,
        view_count: 0,
      });
      setPortal(created);
      toast({ title: "Public link generated" });
    } catch (e) {
      toast({ title: "Failed to generate link", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!portal) return;
    setToggling(true);
    try {
      const updated = await base44.entities.QuotationPortal.update(portal.id, {
        is_enabled: !portal.is_enabled,
      });
      setPortal(updated);
      toast({ title: `Public link ${updated.is_enabled ? "enabled" : "disabled"}` });
    } catch (e) {
      toast({ title: "Toggle failed", description: e?.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleToggleHideNames = async () => {
    setHidingNames(true);
    try {
      const updated = await updateQuotation(quotationId, {
        hide_team_names: !quotation?.hide_team_names,
      });
      onUpdateQuotation?.(updated);
      toast({ title: `Team names ${updated.hide_team_names ? "hidden" : "visible"} on portal` });
    } catch (e) {
      toast({ title: "Toggle failed", description: e?.message, variant: "destructive" });
    } finally {
      setHidingNames(false);
    }
  };

  const copyLink = () => {
    if (!portal) return;
    const url = `${window.location.origin}/portal/${portal.public_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading portal...
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-sm text-muted-foreground">
          Generate a secure public link to share this quotation with your client.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Generate Public Link
        </button>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/portal/${portal.public_token}`;

  return (
    <div className="space-y-4">
      {/* URL + copy */}
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {publicUrl}
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted"
          title="Copy link"
        >
          <Copy className="h-4 w-4" />
        </button>
        <a
          href={`${publicUrl}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted"
          title="Preview (does not count as client view)"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Power className={`h-4 w-4 ${portal.is_enabled ? "text-emerald-600" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium text-foreground">Public Link</span>
          </div>
          <span className={`text-sm font-semibold ${portal.is_enabled ? "text-emerald-600" : "text-muted-foreground"}`}>
            {portal.is_enabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          onClick={handleToggleHideNames}
          disabled={hidingNames}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            {quotation?.hide_team_names ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Hide Team Names</span>
          </div>
          <span className={`text-sm font-semibold ${quotation?.hide_team_names ? "text-primary" : "text-muted-foreground"}`}>
            {quotation?.hide_team_names ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      {/* View tracking */}
      <div className="rounded-lg bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Views</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {portal.first_viewed_at ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Viewed by Client at</span>
                <span className="font-semibold text-foreground">{formatTimestamp(portal.last_viewed_at)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total views</span>
                <span className="text-muted-foreground">{portal.view_count || 0}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not viewed yet</p>
          )}
        </div>
      </div>
    </div>
  );
}