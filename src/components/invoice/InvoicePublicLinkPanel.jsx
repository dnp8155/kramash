import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { toggleInvoicePublicLink } from "@/lib/invoiceService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { Copy, ExternalLink, Eye, EyeOff } from "lucide-react";

export default function InvoicePublicLinkPanel({ invoice, onUpdate }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const enabled = !!invoice?.public_link_enabled;
  const token = invoice?.public_token || "";
  const publicUrl = token ? `${window.location.origin}/invoice/${token}` : "";

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleInvoicePublicLink(invoice.id, !enabled);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }
      invalidateEntities(queryClient, ["Invoice"]);
      toast({ title: enabled ? "Public link disabled" : "Public link enabled" });
      onUpdate?.(data);
    } catch (e) {
      toast({ title: "Failed to toggle public link", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copied to clipboard" });
    } catch (e) {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground">Public Invoice Link</h3>
        </div>
        <Toggle checked={enabled} onChange={handleToggle} disabled={toggling} />
      </div>

      {enabled && token && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono truncate"
            />
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            Views: {Number(invoice.portal_view_count) || 0}
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-muted-foreground">
          Enable to generate a secure public link for this invoice. The link uses a non-guessable token — internal IDs are never exposed.
        </p>
      )}
    </div>
  );
}