import { useState, useEffect, useRef } from "react";
import { Link2, Copy, Loader2, Check, ExternalLink, FileText, Lock, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { cn } from "@/lib/utils";
import Toggle from "@/components/common/Toggle";
import { togglePublicLink } from "@/lib/clientEdgeFunctions";
import { useProGate } from "@/components/common/ProGate";
import { useT } from "@/hooks/useT";
import LinkShareBlock, { useLinkClient, clientSavedPassword } from "@/components/portal/LinkShareBlock";
import { stashPreviewPassword } from "@/lib/portalShare";
import { generatePassword } from "@/lib/clientPortalAccess";

export default function QuotationPublicLinkPanel({ quotation, onUpdated }) {
  const t = useT();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { isPro } = useProGate();
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordInput, setPasswordInput] = useState(quotation?.client_access_password || "");
  const [savingPassword, setSavingPassword] = useState(false);

  const { client: linkClient, ready: clientReady } = useLinkClient(quotation?.client_id);
  const snapshotClient = (() => { try { return JSON.parse(quotation?.client_snapshot || "{}") || {}; } catch { return {}; } })();
  const enabled = !!quotation?.public_link_enabled;
  const quoteEnabled = !!quotation?.quotation_link_enabled;
  const anyEnabled = enabled || quoteEnabled;
  const [togglingQuote, setTogglingQuote] = useState(false);
  const token = quotation?.public_token || "";
  const hasPassword = !!quotation?.client_access_password;
  // A shared link must never be open: it needs the quotation's own password or the client's saved one.
  const covered = hasPassword || !!clientSavedPassword(linkClient);
  const autoSecured = useRef(false);
  const passwordChanged = passwordInput.trim() !== (quotation?.client_access_password || "");
  const viewCount = Number(quotation?.portal_view_count) || 0;
  const firstViewed = quotation?.portal_first_viewed_at;
  const latestViewed = quotation?.portal_latest_viewed_at;

  const portalUrl = token ? `${window.location.origin}/portal/${token}` : "";
  const quotationUrl = token ? `${window.location.origin}/q/${token}` : "";
  const isFinalized = quotation?.status === "finalized" || quotation?.status === "accepted";

  useEffect(() => { setPasswordInput(quotation?.client_access_password || ""); }, [quotation?.client_access_password]);

  // Links shared before passwords were required get one automatically the first time this page opens.
  useEffect(() => {
    if (!isPro || !anyEnabled || !clientReady || covered || autoSecured.current || !quotation?.id) return;
    autoSecured.current = true;
    togglePublicLink({ quotation_id: quotation.id, portal_password: generatePassword() })
      .then((d) => onUpdated?.(d))
      .catch(() => { autoSecured.current = false; });
  }, [isPro, anyEnabled, clientReady, covered, quotation?.id]);

  const toggle = async () => {
    setToggling(true);
    try {
      const d = await togglePublicLink({ quotation_id: quotation.id, enabled: !enabled, ...(!enabled && !covered ? { portal_password: generatePassword() } : {}) });
      onUpdated?.(d);
      toast({ title: d.public_link_enabled ? t("Public link enabled") : t("Public link disabled"), description: d.public_link_enabled ? t("The client portal is now accessible.") : t("The portal is no longer accessible.") });
    } catch (e) { toast({ title: t("Failed to toggle public link"), description: e?.message, variant: "destructive" }); }
    finally { setToggling(false); }
  };

  // The quotation signing link (/q/<token>) has its own switch — the project portal is not needed to share it.
  const toggleQuoteLink = async () => {
    setTogglingQuote(true);
    try {
      const d = await togglePublicLink({ quotation_id: quotation.id, quotation_link_enabled: !quoteEnabled, ...(!quoteEnabled && !covered ? { portal_password: generatePassword() } : {}) });
      onUpdated?.(d);
      toast({ title: d.quotation_link_enabled ? t("Quotation link enabled") : t("Quotation link disabled"), description: d.quotation_link_enabled ? t("The client can now open and sign this quotation.") : t("The quotation link no longer opens.") });
    } catch (e) { toast({ title: t("Failed to update quotation link"), description: e?.message, variant: "destructive" }); }
    finally { setTogglingQuote(false); }
  };

  const copyLink = () => { if (!portalUrl) return; navigator.clipboard.writeText(portalUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const [copiedQuote, setCopiedQuote] = useState(false);
  const copyQuotationLink = () => { if (!quotationUrl) return; navigator.clipboard.writeText(quotationUrl); setCopiedQuote(true); setTimeout(() => setCopiedQuote(false), 2000); };

  const savePassword = async () => {
    setSavingPassword(true);
    try {
      const next = passwordInput.trim() || (clientSavedPassword(linkClient) ? "" : generatePassword());
      const d = await togglePublicLink({ quotation_id: quotation.id, portal_password: next });
      setPasswordInput(d.client_access_password || "");
      onUpdated?.(d);
      toast({ title: d.client_access_password ? t("Portal password set") : t("Portal password removed"), description: d.client_access_password ? t("Clients will need this password to view the portal.") : t("The portal is now open without a password.") });
    } catch (e) { toast({ title: t("Failed to update password"), description: e?.message, variant: "destructive" }); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{t("Share with Client")}</h3>
        {!isPro && (<span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">Pro</span>)}
      </div>

      {!isPro && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs">
          <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-muted-foreground flex-1">{t("Client Portal is a Pro feature. Upgrade to share project portals with clients.")}</span>
          <a href="/plan" className="font-semibold text-warning underline shrink-0">{t("Upgrade")}</a>
        </div>
      )}

      {isPro && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> {t("Quotation Link")}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!isFinalized ? t("Finalize the quotation to share it with the client.") : quoteEnabled ? t("Client can open, review and sign the quotation online.") : t("Off — turn on to share just this quotation. No client portal needed.")}
              </p>
            </div>
            <Toggle checked={quoteEnabled} onChange={toggleQuoteLink} disabled={togglingQuote || !isFinalized} label={t("Quotation Link")} />
          </div>
          {quoteEnabled && isFinalized && quotationUrl && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <input readOnly value={quotationUrl} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground truncate" />
              </div>
              <button onClick={copyQuotationLink} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
                {copiedQuote ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedQuote ? t("Copied") : t("Copy")}
              </button>
              <a href={`${quotationUrl}?preview=1`} onClick={() => stashPreviewPassword(token, quotation?.client_access_password || clientSavedPassword(linkClient))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> {t("Open")}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div>
          <div className="text-sm font-medium text-foreground">{t("Client Project Portal Link")}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{enabled ? t("Portal is accessible to the client") : t("Optional — a full project page (schedule, payments). Not needed to share the quotation.")}</p>
        </div>
        <Toggle checked={enabled} onChange={toggle} disabled={toggling || !isPro} label={t("Client Project Portal Link")} />
      </div>

      {enabled && isPro && portalUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <input readOnly value={portalUrl} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground truncate" />
            </div>
            <button onClick={copyLink} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("Copied") : t("Copy")}
            </button>
            <a href={`${portalUrl}?preview=1`} onClick={() => stashPreviewPassword(token, quotation?.client_access_password || clientSavedPassword(linkClient))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">
              <ExternalLink className="w-3.5 h-3.5" /> {t("Open")}
            </a>
          </div>
        </div>
      )}

      {anyEnabled && isPro && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Password")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasPassword ? t("Portal is password-protected. Share this password with your client separately. Invoices created from this quotation use the same password.") : t("Every shared link needs a password — one is created for you. Change it here if you like, or clear it to use the client's saved portal password.")}
          </p>
          <div className="flex items-center gap-2">
            <input type="text" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder={t("Set portal password (leave blank to remove)")} className="flex-1 min-w-0 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
            <button type="button" onClick={() => setPasswordInput(generatePassword())} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium sm:hover:bg-muted transition-all shrink-0">{t("Generate")}</button>
            <button onClick={savePassword} disabled={savingPassword || !passwordChanged} className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0", passwordChanged ? "bg-primary text-primary-foreground sm:hover:bg-primary-hover" : "border border-border bg-card text-muted-foreground", (savingPassword || !passwordChanged) && "opacity-50 cursor-not-allowed")}>
              {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {hasPassword ? t("Update") : t("Set")}
            </button>
          </div>
        </div>
      )}

      {anyEnabled && isPro && (quotationUrl || portalUrl) && (
        <LinkShareBlock
          kind="quotation"
          docNumber={quotation?.quotation_number}
          url={quoteEnabled && isFinalized && quotationUrl ? quotationUrl : portalUrl}
          ownPassword={quotation?.client_access_password || ""}
          ownPasswordLabel={t("This quotation's password — invoices created from it use the same one.")}
          client={linkClient}
          clientName={snapshotClient.name}
          clientPhone={snapshotClient.phone}
          hidePassword={hasPassword}
        />
      )}

      {anyEnabled && isPro && viewCount > 0 && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Client Views")}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("View count")}</span>
            <span className="font-medium text-foreground">{viewCount}</span>
          </div>
          {firstViewed && (<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("First viewed")}</span><span className="font-medium text-foreground">{formatDateTime(firstViewed)}</span></div>)}
          {latestViewed && (<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("Latest viewed")}</span><span className="font-medium text-foreground">{formatDateTime(latestViewed)}</span></div>)}
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}