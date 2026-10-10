import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import LinkShareBlock, { useLinkClient, clientSavedPassword } from "@/components/portal/LinkShareBlock";
import { generatePassword } from "@/lib/clientPortalAccess";
import { stashPreviewPassword } from "@/lib/portalShare";
import { useToast } from "@/components/ui/use-toast";
import { toggleInvoicePublicLink } from "@/lib/invoiceService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { useFeatureGate } from "@/components/common/ProGate";
import { Copy, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function InvoicePublicLinkPanel({ invoice, onUpdate }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const { client: linkClient, ready: clientReady } = useLinkClient(invoice?.client_id);
  // An invoice made from a quotation that has its own password uses that same password.
  const [quotationPassword, setQuotationPassword] = useState("");
  const [quotationReady, setQuotationReady] = useState(!invoice?.quotation_id);
  const [ownPassword, setOwnPassword] = useState(invoice?.client_access_password || "");
  const autoSecured = useRef(false);
  useEffect(() => {
    let live = true;
    if (!invoice?.quotation_id) { setQuotationPassword(""); setQuotationReady(true); return undefined; }
    setQuotationReady(false);
    base44.entities.Quotation.get(invoice.quotation_id)
      .then((q) => { if (live) { setQuotationPassword(q?.client_access_password || ""); setQuotationReady(true); } })
      .catch(() => { if (live) { setQuotationPassword(""); setQuotationReady(true); } });
    return () => { live = false; };
  }, [invoice?.quotation_id]);
  const snapshotClient = (() => { try { return JSON.parse(invoice?.client_snapshot || "{}") || {}; } catch { return {}; } })();

  const enabled = !!invoice?.public_link_enabled;
  // A shared link must never be open: the invoice's own password, its quotation's, or the client's saved one.
  const covered = !!ownPassword || !!quotationPassword || !!clientSavedPassword(linkClient);

  const secureInvoice = async () => {
    const pw = generatePassword();
    await base44.entities.Invoice.update(invoice.id, { client_access_password: pw });
    setOwnPassword(pw);
  };

  // Links shared before passwords were required get one automatically the first time this page opens.
  useEffect(() => {
    if (!enabled || !clientReady || !quotationReady || covered || autoSecured.current || !invoice?.id) return;
    autoSecured.current = true;
    secureInvoice().catch(() => { autoSecured.current = false; });
     
  }, [enabled, clientReady, quotationReady, covered, invoice?.id]);
  const token = invoice?.public_token || "";
  const publicUrl = token ? `${window.location.origin}/invoice/${token}` : "";

  const handleToggle = async () => {
    if (!enabled && !checkFeature("link_sharing_enabled", "Link Sharing")) return;
    setToggling(true);
    try {
      const res = await toggleInvoicePublicLink(invoice.id, !enabled);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: t(data.error), variant: "destructive" });
        return;
      }
      if (!enabled && !covered) await secureInvoice();
      invalidateEntities(queryClient, ["Invoice"]);
      toast({ title: enabled ? t("Public link disabled") : t("Public link enabled") });
      onUpdate?.(data);
    } catch (e) {
      toast({ title: t("Failed to toggle public link"), variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: t("Link copied to clipboard") });
    } catch (e) {
      toast({ title: t("Could not copy"), variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground">{t("Public Invoice Link")}</h3>
        </div>
        <Toggle checked={enabled} onChange={handleToggle} disabled={toggling} />
      </div>

      {enabled && token && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input readOnly value={publicUrl} className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono truncate" />
            <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-3.5 h-3.5" /></Button>
            <a href={publicUrl} onClick={() => stashPreviewPassword(token, ownPassword || quotationPassword || clientSavedPassword(linkClient))} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="w-3.5 h-3.5" /></Button>
            </a>
          </div>
          <div className="text-xs text-muted-foreground">{t("Views")}: {Number(invoice.portal_view_count) || 0}</div>
          <LinkShareBlock
            kind="invoice"
            docNumber={invoice?.invoice_number}
            url={publicUrl}
            ownPassword={ownPassword || quotationPassword}
            ownPasswordLabel={ownPassword ? t("This invoice's password.") : t("Same password as the quotation this invoice was created from.")}
            client={linkClient}
            clientName={snapshotClient.name}
            clientPhone={snapshotClient.phone}
          />
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-muted-foreground">
          {t("Enable to generate a secure public link for this invoice. The link uses a non-guessable token — internal IDs are never exposed.")}
        </p>
      )}
      {FeatureGateDialog}
    </div>
  );
}