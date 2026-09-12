import { useState } from "react";
import { Link2, Copy, Eye, EyeOff, Loader2, Check, ExternalLink, FileText, Lock, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { cn } from "@/lib/utils";

// Admin-side panel for controlling the public Client Project Portal link.
// Toggles public link on/off, generates secure token, hides team names, and shows view tracking.
export default function PublicLinkPanel({ quotation, onUpdated }) {
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const isPro = workspace?.plan_type === "pro";
  const [toggling, setToggling] = useState(false);
  const [hidingNames, setHidingNames] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordInput, setPasswordInput] = useState(quotation?.client_access_password || "");
  const [savingPassword, setSavingPassword] = useState(false);

  const enabled = !!quotation?.public_link_enabled;
  const token = quotation?.public_token || "";
  const hideNames = !!quotation?.hide_team_names;
  const hasPassword = !!quotation?.client_access_password;
  const viewCount = Number(quotation?.portal_view_count) || 0;
  const firstViewed = quotation?.portal_first_viewed_at;
  const latestViewed = quotation?.portal_latest_viewed_at;

  const portalUrl = token ? `${window.location.origin}/portal/${token}` : "";
  const quotationUrl = token ? `${window.location.origin}/q/${token}` : "";
  const isFinalized = quotation?.status === "finalized" || quotation?.status === "accepted";

  const toggle = async () => {
    setToggling(true);
    try {
      const res = await base44.functions.invoke("togglePublicLink", {
        quotation_id: quotation.id,
        enabled: !enabled
      });
      const d = res?.data || res;
      onUpdated?.(d);
      toast({
        title: d.public_link_enabled ? "Public link enabled" : "Public link disabled",
        description: d.public_link_enabled ? "The client portal is now accessible." : "The portal is no longer accessible."
      });
    } catch (e) {
      toast({ title: "Failed to toggle public link", description: e?.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const toggleHideNames = async () => {
    setHidingNames(true);
    try {
      const res = await base44.functions.invoke("togglePublicLink", {
        quotation_id: quotation.id,
        hide_team_names: !hideNames
      });
      const d = res?.data || res;
      onUpdated?.(d);
      toast({ title: hideNames ? "Team names visible" : "Team names hidden" });
    } catch (e) {
      toast({ title: "Failed to update visibility", description: e?.message, variant: "destructive" });
    } finally {
      setHidingNames(false);
    }
  };

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedQuote, setCopiedQuote] = useState(false);
  const copyQuotationLink = () => {
    if (!quotationUrl) return;
    navigator.clipboard.writeText(quotationUrl);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const savePassword = async () => {
    setSavingPassword(true);
    try {
      const res = await base44.functions.invoke("togglePublicLink", {
        quotation_id: quotation.id,
        portal_password: passwordInput.trim()
      });
      const d = res?.data || res;
      onUpdated?.(d);
      toast({
        title: d.client_access_password ? "Portal password set" : "Portal password removed",
        description: d.client_access_password ? "Clients will need this password to view the portal." : "The portal is now open without a password."
      });
    } catch (e) {
      toast({ title: "Failed to update password", description: e?.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Client Project Portal</h3>
        {!isPro && (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
            Pro
          </span>
        )}
      </div>

      {!isPro && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs">
          <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
          <span className="text-muted-foreground flex-1">Client Portal is a Pro feature. Upgrade to share project portals with clients.</span>
          <a href="/plan" className="font-semibold text-warning underline shrink-0">Upgrade</a>
        </div>
      )}

      {/* Public Link Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Public Link</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled ? "Portal is accessible to the client" : "Portal is currently disabled"}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={toggling || !isPro}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted-foreground/30",
            (toggling || !isPro) && "opacity-50"
          )}
        >
          {toggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin absolute left-1 text-primary-foreground" />
          ) : (
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          )}
        </button>
      </div>

      {/* Portal URL + Copy */}
      {enabled && isPro && portalUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <input
                readOnly
                value={portalUrl}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground truncate"
              />
            </div>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-all shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={`${portalUrl}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-all shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>
      )}

      {/* Quotation Signing Link (URL 2) */}
      {isFinalized && isPro && quotationUrl && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quotation Signing Link</span>
          </div>
          <p className="text-xs text-muted-foreground">Share this link with the client to review and sign the quotation online.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <input
                readOnly
                value={quotationUrl}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground truncate"
              />
            </div>
            <button
              onClick={copyQuotationLink}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-all shrink-0"
            >
              {copiedQuote ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedQuote ? "Copied" : "Copy"}
            </button>
            <a
              href={`${quotationUrl}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-all shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>
      )}

      {/* Hide Team Names Toggle */}
      {enabled && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div>
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
              {hideNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Hide Team Names
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show roles only (e.g. "1× Lead Photographer")
            </p>
          </div>
          <button
            onClick={toggleHideNames}
            disabled={hidingNames}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
              hideNames ? "bg-primary" : "bg-muted-foreground/30",
              hidingNames && "opacity-50"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                hideNames ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      )}

      {/* Password Protection */}
      {enabled && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password Protection</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasPassword ? "Portal is password-protected. Share this password with your client separately." : "Optional — add a password so only clients with it can view the portal."}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Set portal password (leave blank to remove)"
              className="flex-1 min-w-0 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              onClick={savePassword}
              disabled={savingPassword}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-all shrink-0"
            >
              {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {hasPassword ? "Update" : "Set"}
            </button>
          </div>
        </div>
      )}

      {/* View Tracking */}
      {enabled && viewCount > 0 && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Views</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">View count</span>
            <span className="font-medium text-foreground">{viewCount}</span>
          </div>
          {firstViewed && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">First viewed</span>
              <span className="font-medium text-foreground">{formatDateTime(firstViewed)}</span>
            </div>
          )}
          {latestViewed && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Latest viewed</span>
              <span className="font-medium text-foreground">{formatDateTime(latestViewed)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}