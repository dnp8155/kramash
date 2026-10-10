import { useState, forwardRef, useImperativeHandle } from "react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import { useFeatureGate } from "@/components/common/ProGate";
import PortalCredentials from "@/components/portal/PortalCredentials";
import { enableClientPortal, disableClientPortal, regenerateClientPortalPassword } from "@/lib/clientPortalAccess";
import { KeyRound, CheckCircle2, Loader2, Power } from "lucide-react";

// "Quick Portal Access" section for the Client Details page.
// Lets the workspace admin enable/disable the password-only portal gate,
// view the shareable link + generated password, and regenerate the password.
const PortalAccessSection = forwardRef(function PortalAccessSection({ client, workspaceId }, ref) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT();

  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(!!client.portal_access_enabled);
  const [loginUrl, setLoginUrl] = useState("");
  // The password is saved on the client row, so it shows on any device. localStorage is only a fallback
  // for passwords generated before that column existed.
  const [password, setPassword] = useState(() => {
    if (client.portal_password_plain) return client.portal_password_plain;
    try { return localStorage.getItem(`portal_pw_${client.id}`) || ""; } catch { return ""; }
  });
  const [changedAt, setChangedAt] = useState(client.portal_password_changed_at || "");
  const [graceUntil, setGraceUntil] = useState(client.portal_prev_password_until || "");
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const savePw = (id, pw) => {
    try {
      if (pw) localStorage.setItem(`portal_pw_${id}`, pw);
      else localStorage.removeItem(`portal_pw_${id}`);
    } catch { /* noop */ }
  };

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["client", client.id, workspaceId] });
    invalidateEntities(queryClient, ["Client"]);
  };

  const handleEnable = async () => {
    if (!checkFeature("client_portal_enabled", "Client Portal")) return;
    setBusy(true);
    try {
      const d = await enableClientPortal(client.id, workspaceId);
      setEnabled(true);
      setLoginUrl(d.login_url || "");
      setPassword(d.password || "");
      setChangedAt(d.changed_at || "");
      savePw(client.id, d.password || "");
      reload();
      toast({ title: t("Portal access enabled"), description: t("Share the link and password with your client.") });
    } catch (e) {
      toast({ title: t("Failed to enable"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm(t("Disable portal access for this client? They will no longer be able to sign in with their password."))) return;
    setBusy(true);
    try {
      await disableClientPortal(client.id, workspaceId);
      setEnabled(false);
      setLoginUrl("");
      setPassword("");
      setChangedAt("");
      setGraceUntil("");
      savePw(client.id, "");
      reload();
      toast({ title: t("Portal access disabled") });
    } catch (e) {
      toast({ title: t("Failed to disable"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const d = await regenerateClientPortalPassword(client.id, workspaceId);
      setPassword(d.password || "");
      setChangedAt(d.changed_at || "");
      setGraceUntil(d.grace_until || "");
      savePw(client.id, d.password || "");
      reload();
      toast({ title: t("New password generated"), description: t("Share the new password with your client.") });
    } catch (e) {
      toast({ title: t("Failed to regenerate"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({ handleEnable }));

  if (!enabled) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3 lg:items-center">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <KeyRound className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{t("Quick Portal Access")}</div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3 lg:mb-0">
                {t("Share a simple link and password so this client can view their portal.")}
              </p>
            </div>
            <Button size="sm" className="lg:shrink-0" onClick={handleEnable} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              {t("Enable & Generate Password")}
            </Button>
          </div>
        </div>
        {FeatureGateDialog}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
            <KeyRound className="w-4.5 h-4.5 text-success" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{t("Quick Portal Access")}</div>
            <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("Active")}</div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDisable} disabled={busy}>
          <Power className="w-3.5 h-3.5" /> {t("Disable")}
        </Button>
      </div>

      <PortalCredentials
        kind="client"
        name={client.name}
        phone={client.phone}
        link={loginUrl || `${window.location.origin}/client-login/${client.portal_access_token || ""}`}
        password={password}
        changedAt={changedAt}
        graceUntil={graceUntil}
        busy={busy}
        onRegenerate={handleRegenerate}
      />
      {FeatureGateDialog}
    </div>
  );
});

export default PortalAccessSection;