import { useState, forwardRef, useImperativeHandle } from "react";
import PortalCredentials from "@/components/portal/PortalCredentials";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import { useFeatureGate } from "@/components/common/ProGate";
import { enableTeamPortalAccess, updateTeamPortalPassword } from "@/lib/clientEdgeFunctions";
import { useToast } from "@/components/ui/use-toast";
import { KeyRound, CheckCircle2, Loader2, Power } from "lucide-react";
import { useT } from "@/hooks/useT";

const teamPwKey = (memberId) => `team_portal_pw_${memberId}`;
function getStoredTeamPw(memberId) {
  try { return localStorage.getItem(teamPwKey(memberId)) || ""; } catch { return ""; }
}
function setStoredTeamPw(memberId, pw) {
  try { if (pw) localStorage.setItem(teamPwKey(memberId), pw); else localStorage.removeItem(teamPwKey(memberId)); } catch { /* ignore */ }
}

const TeamPortalAccessSection = forwardRef(function TeamPortalAccessSection({ member, workspaceId }, ref) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(!!member.portal_access_enabled);
  const [loginUrl, setLoginUrl] = useState("");
  const [password, setPassword] = useState(() => member.portal_password_plain || getStoredTeamPw(member.id));
  const [changedAt, setChangedAt] = useState(member.portal_password_changed_at || "");
  const [graceUntil, setGraceUntil] = useState(member.portal_prev_password_until || "");
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["team-member", member.id, workspaceId] });
    invalidateEntities(queryClient, ["TeamMember"]);
  };

  const handleEnable = async () => {
    if (!checkFeature("team_portal_enabled", "Team Member Portal")) return;
    setBusy(true);
    try {
      const d = await enableTeamPortalAccess({ team_member_id: member.id, workspace_id: workspaceId, action: "enable" });
      setEnabled(true);
      setLoginUrl(d.login_url || "");
      setPassword(d.password || "");
      setChangedAt(d.changed_at || "");
      setStoredTeamPw(member.id, d.password || "");
      reload();
      toast({ title: t("Portal access enabled"), description: t("Share the link and password with your team member.") });
    } catch (e) {
      toast({ title: t("Failed to enable"), description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm(t("Disable portal access for this team member? They will no longer be able to sign in with their password."))) return;
    setBusy(true);
    try {
      await enableTeamPortalAccess({ team_member_id: member.id, workspace_id: workspaceId, action: "disable" });
      setEnabled(false);
      setLoginUrl("");
      setPassword("");
      setChangedAt("");
      setGraceUntil("");
      setStoredTeamPw(member.id, "");
      reload();
      toast({ title: t("Portal access disabled") });
    } catch (e) {
      toast({ title: t("Failed to disable"), description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const d = await updateTeamPortalPassword({ team_member_id: member.id, workspace_id: workspaceId, auto_generate: true });
      setPassword(d.password || "");
      setChangedAt(d.changed_at || "");
      setGraceUntil(d.grace_until || "");
      setStoredTeamPw(member.id, d.password || "");
      reload();
      toast({ title: t("New password generated"), description: t("Share the new password with your team member.") });
    } catch (e) {
      toast({ title: t("Failed to regenerate"), description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({ handleEnable }));

  if (!enabled) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <KeyRound className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("Team Member Portal (password-only)")}</div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              {t("Give this team member a simple link + password to view their schedule, payments, and projects — no email login needed.")}
            </p>
            <Button size="sm" onClick={handleEnable} disabled={busy}>
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
            <div className="text-sm font-semibold text-foreground">{t("Team Member Portal")}</div>
            <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("Active")}</div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDisable} disabled={busy}>
          <Power className="w-3.5 h-3.5" /> {t("Disable")}
        </Button>
      </div>

      <PortalCredentials
        kind="team"
        name={member.name}
        phone={member.phone}
        link={loginUrl || `${window.location.origin}/team-login/${member.portal_access_token || ""}`}
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

export default TeamPortalAccessSection;