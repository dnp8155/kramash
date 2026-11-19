import { useState, useEffect, useRef } from "react";
import ProLock from "@/components/common/ProLock";
import { base44 } from "@/api/base44Client";
import LinkShareBlock, { useLinkClient, clientSavedPassword } from "@/components/portal/LinkShareBlock";
import { generatePassword } from "@/lib/clientPortalAccess";
import { stashPreviewPassword } from "@/lib/portalShare";
import { useToast } from "@/components/ui/use-toast";
import { toggleInvoicePublicLink } from "@/lib/invoiceService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import Toggle from "@/components/common/Toggle";
import { useFeatureGate } from "@/components/common/ProGate";
import { Copy, Check, ExternalLink, Link2, FileText } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function InvoicePublicLinkPanel({ invoice, onUpdate }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
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
      toast({ title: enabled ? t("Invoice link disabled") : t("Invoice link enabled"), description: enabled ? t("The invoice link no longer opens.") : t("Your client can now open this invoice.") });
      onUpdate?.(data);
    } catch {
      toast({ title: t("Failed to update invoice link"), variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("Could not copy"), variant: "destructive" });
    }
  };

  return (
    <ProLock feature="link_sharing_enabled" label="Link Sharing" unlocked={enabled}>
    {/* Same look and words as the quotation's Share with Client card (QuotationPublicLinkPanel), for an invoice. */}
    <div className="bg-card border border-border rounded-[15px] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{t("Share with Client")}</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> {t("Invoice Link")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled ? t("Your client opens and views this invoice online.") : t("Off. Turn on to send this invoice to your client.")}
            </p>
          </div>
          <Toggle checked={enabled} onChange={handleToggle} disabled={toggling} label={t("Invoice Link")} />
        </div>
        {enabled && token && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <input readOnly value={publicUrl} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground truncate" />
            </div>
            <button onClick={copyLink} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("Copied") : t("Copy")}
            </button>
            <a href={publicUrl} onClick={() => stashPreviewPassword(token, ownPassword || quotationPassword || clientSavedPassword(linkClient))} target="_blank" data-in-app rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
              <ExternalLink className="w-3.5 h-3.5" /> {t("Open")}
            </a>
          </div>
        )}
      </div>

      {enabled && token && (
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
      )}

      {enabled && token && Number(invoice.portal_view_count) > 0 && (
        <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("View count")}</span>
          <span className="font-medium text-foreground">{Number(invoice.portal_view_count)}</span>
        </div>
      )}
      {FeatureGateDialog}
    </div>
    </ProLock>
  );
}