import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { Link2, Copy, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function JobSheetShare({ eventId }) {
  const { workspaceId } = useWorkspace();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!eventId || !workspaceId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.JobSheetPortal.filter({
          event_id: eventId,
          workspace_id: workspaceId,
        });
        setPortal(list && list.length > 0 ? list[0] : null);
      } catch {
        setPortal(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, workspaceId]);

  const createLink = async () => {
    setCreating(true);
    try {
      const token =
        (crypto.randomUUID?.() || "") + (crypto.randomUUID?.() || "");
      const created = await base44.entities.JobSheetPortal.create({
        workspace_id: workspaceId,
        event_id: eventId,
        public_token: token.replace(/-/g, ""),
        is_enabled: true,
      });
      setPortal(created);
      toast({ title: "Share link created" });
    } catch (e) {
      toast({ title: "Failed to create link", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleLink = async () => {
    if (!portal) return;
    setToggling(true);
    try {
      const updated = await base44.entities.JobSheetPortal.update(portal.id, {
        is_enabled: !portal.is_enabled,
      });
      setPortal({ ...portal, is_enabled: updated.is_enabled });
      toast({
        title: updated.is_enabled ? "Link enabled" : "Link disabled",
      });
    } catch (e) {
      toast({ title: "Toggle failed", description: e?.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const copyUrl = () => {
    if (!portal) return;
    const url = `${window.location.origin}/job-sheet/${portal.public_token}`;
    navigator.clipboard?.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  if (loading) {
    return (
      <Card className="no-print mb-6">
        <CardBody className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading share settings…
        </CardBody>
      </Card>
    );
  }

  if (!portal) {
    return (
      <Card className="no-print mb-6">
        <CardHeader>
          <CardTitle>Share Job Sheet</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-muted-foreground">
            Generate a secure read-only public URL for crew, supervisors, and freelancers.
            No financial data is exposed. No internal database IDs in the URL.
          </p>
          <Button onClick={createLink} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Create Share Link
          </Button>
        </CardBody>
      </Card>
    );
  }

  const shareUrl = `${window.location.origin}/job-sheet/${portal.public_token}`;

  return (
    <Card className="no-print mb-6">
      <CardHeader>
        <CardTitle>Share Job Sheet</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {/* URL display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
            {shareUrl}
          </div>
          <Button variant="outline" size="icon" onClick={copyUrl}>
            <Copy className="h-4 w-4" />
          </Button>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>

        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-start gap-2">
            {portal.is_enabled ? (
              <Eye className="mt-0.5 h-4 w-4 text-success" />
            ) : (
              <EyeOff className="mt-0.5 h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {portal.is_enabled ? "Link Active" : "Link Disabled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {portal.is_enabled
                  ? "Crew can access the job sheet via the URL."
                  : "This Job Sheet link is no longer available."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleLink}
            disabled={toggling}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              portal.is_enabled ? "bg-success" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                portal.is_enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* View stats */}
        {portal.view_count > 0 && (
          <p className="text-xs text-muted-foreground">
            {portal.view_count} {portal.view_count === 1 ? "view" : "views"} · Last viewed{" "}
            {new Date(portal.last_viewed_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardBody>
    </Card>
  );
}