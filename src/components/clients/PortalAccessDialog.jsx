import { useMemo, useState } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import { useFeatureGate } from "@/components/common/ProGate";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { enableClientPortal } from "@/lib/clientPortalAccess";
import { enableTeamPortalAccess } from "@/lib/clientEdgeFunctions";
import { buildPortalShareMessage, whatsappShareUrl } from "@/lib/portalShare";
import { whatsappNumber } from "@/lib/validation";
import { Link2, KeyRound, Copy, CheckCircle2, Share2, Loader2, Power } from "lucide-react";

// Every person's own portal link + password in one place. Each one has a different link
// (/client-login/<token> or /team-login/<token>), so the Clients and Team pages list them instead of offering one
// generic link. `kind` picks the portal: "client" (default) or "team".
const KINDS = {
  client: {
    path: "client-login", feature: "client_portal_enabled", featureLabel: "Client Portal", noun: "client",
    enable: (id, workspaceId) => enableClientPortal(id, workspaceId),
  },
  team: {
    path: "team-login", feature: "team_portal_enabled", featureLabel: "Team Member Portal", noun: "team member",
    enable: (id, workspaceId) => enableTeamPortalAccess({ team_member_id: id, workspace_id: workspaceId, action: "enable" }),
  },
};

export default function PortalAccessDialog({ open, onOpenChange, clients, workspaceId, onChanged, kind = "client" }) {
  const cfg = KINDS[kind] || KINDS.client;
  const t = useT();
  const { toast } = useToast();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (clients || [])
      .filter((c) => !q || `${c.name} ${c.phone || ""}`.toLowerCase().includes(q))
      // Clients with portal access first, then A–Z.
      .sort((a, b) => Number(!!b.portal_access_enabled) - Number(!!a.portal_access_enabled) || (a.name || "").localeCompare(b.name || ""));
  }, [clients, query]);

  const enabledCount = (clients || []).filter((c) => c.portal_access_enabled && c.portal_access_token).length;
  const linkFor = (c) => `${window.location.origin}/${cfg.path}/${c.portal_access_token}`;

  const copy = (value, key) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    }).catch(() => toast({ title: t("Could not copy link"), variant: "destructive" }));
  };

  // Turns the portal on (or saves a password for an older setup that has none) — an already-working link never changes.
  const enable = async (c) => {
    if (!checkFeature(cfg.feature, cfg.featureLabel)) return;
    setBusyId(c.id);
    try {
      await cfg.enable(c.id, workspaceId);
      onChanged?.();
      toast({ title: t("Portal access enabled"), description: t(kind === "team" ? "Share the link and password with your team member." : "Share the link and password with your client.") });
    } catch (e) {
      toast({ title: t("Failed to enable"), description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AppDialog open={open} onOpenChange={onOpenChange}>
        <AppDialogContent maxWidth="sm:max-w-xl">
          <AppDialogHeader>
            <AppDialogTitle>{t("Portal access")}</AppDialogTitle>
            <AppDialogDescription>
              {t(kind === "team" ? "Each team member has their own link and password." : "Each client has their own link and password.")} {enabledCount} {t("of")} {(clients || []).length} {t("have portal access.")}
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody>
            <SearchInput placeholder={t(kind === "team" ? "Search team members" : "Search clients")} value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t(kind === "team" ? "No team members found" : "No clients found")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((c) => {
                  const on = !!c.portal_access_enabled && !!c.portal_access_token;
                  const hasPw = !!c.portal_password_plain;
                  const message = on && hasPw ? buildPortalShareMessage({ name: c.name, link: linkFor(c), password: c.portal_password_plain, kind }) : "";
                  return (
                    <li key={c.id} className="py-3 flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                        <div className="text-xs mt-0.5">
                          {on
                            ? <span className="text-success font-medium">{t("Portal on")}</span>
                            : <span className="text-muted-foreground">{t("Portal off")}</span>}
                        </div>
                      </div>
                      {on ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => copy(linkFor(c), `${c.id}:link`)} title={t("Copy link")} aria-label={t("Copy link")}>
                            {copied === `${c.id}:link` ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Link2 className="w-3.5 h-3.5" />}
                          </Button>
                          {hasPw ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => copy(c.portal_password_plain, `${c.id}:pw`)} title={t("Copy password")} aria-label={t("Copy password")}>
                                {copied === `${c.id}:pw` ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <KeyRound className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => window.open(whatsappShareUrl(whatsappNumber(c.phone), message), "_blank")} title="WhatsApp" aria-label="WhatsApp">
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copy(message, `${c.id}:msg`)} title={t("Copy link + password")} aria-label={t("Copy link + password")}>
                                {copied === `${c.id}:msg` ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => enable(c)} disabled={busyId === c.id}>
                              {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} {t("Set password")}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => enable(c)} disabled={busyId === c.id} className="shrink-0">
                          {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />} {t("Enable")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AppDialogBody>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("Close")}</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
      {FeatureGateDialog}
    </>
  );
}
