import { useState, forwardRef, useImperativeHandle } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import { useFeatureGate } from "@/components/common/ProGate";
import {
  KeyRound, Link2, Copy, CheckCircle2, RefreshCw, Loader2, Lock, Eye, EyeOff, Power
} from "lucide-react";

// "Quick Portal Access" section for the Team Member Details page.
// Lets the workspace admin enable/disable the password-only portal gate,
// view the shareable link + generated password, and regenerate the password.
// This section is NOT shown for self members (workspace owner).
const TeamPortalAccessSection = forwardRef(function TeamPortalAccessSection({ member, workspaceId }, ref) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(!!member.portal_access_enabled);
  const [loginUrl, setLoginUrl] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["team-member", member.id, workspaceId] });
    invalidateEntities(queryClient, ["TeamMember"]);
  };

  const handleEnable = async () => {
    if (!checkFeature("team_portal_enabled", "Team Member Portal")) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("enableTeamPortalAccess", {
        team_member_id: member.id,
        workspace_id: workspaceId,
        action: "enable"
      });
      const d = res?.data || res;
      setEnabled(true);
      setLoginUrl(d.login_url || "");
      setPassword(d.password || "");
      setShowPassword(true);
      reload();
      toast({ title: "Portal access enabled", description: "Share the link and password with your team member." });
    } catch (e) {
      toast({ title: "Failed to enable", description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Disable portal access for this team member? They will no longer be able to sign in with their password.")) return;
    setBusy(true);
    try {
      await base44.functions.invoke("enableTeamPortalAccess", {
        team_member_id: member.id,
        workspace_id: workspaceId,
        action: "disable"
      });
      setEnabled(false);
      setLoginUrl("");
      setPassword("");
      reload();
      toast({ title: "Portal access disabled" });
    } catch (e) {
      toast({ title: "Failed to disable", description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("updateTeamPortalPassword", {
        team_member_id: member.id,
        workspace_id: workspaceId,
        auto_generate: true
      });
      const d = res?.data || res;
      setPassword(d.password || "");
      setShowPassword(true);
      toast({ title: "New password generated", description: "Share the new password with your team member." });
    } catch (e) {
      toast({ title: "Failed to regenerate", description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copy = (value, field) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    });
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
            <div className="text-sm font-semibold text-foreground">Team Member Portal (password-only)</div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Give this team member a simple link + password to view their schedule, payments, and projects — no email login needed.
            </p>
            <Button size="sm" onClick={handleEnable} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Enable & Generate Password
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
            <div className="text-sm font-semibold text-foreground">Team Member Portal</div>
            <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDisable} disabled={busy}>
          <Power className="w-3.5 h-3.5" /> Disable
        </Button>
      </div>

      {/* Shareable link */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Portal Link
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={loginUrl || `${window.location.origin}/team-login/${member.portal_access_token || ""}`}
            onClick={(e) => e.target.select()}
            className="flex-1 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono"
          />
          <Button size="sm" variant="outline" onClick={() => copy(loginUrl || `${window.location.origin}/team-login/${member.portal_access_token || ""}`, "link")} className="shrink-0">
            {copiedField === "link" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Copied</> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Password
        </div>
        <div className="flex items-center gap-2">
          <input
            type={showPassword ? "text" : "password"}
            readOnly
            value={password || "••••••••"}
            onClick={(e) => { e.target.select(); setShowPassword(true); }}
            className="flex-1 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono"
          />
          <Button size="sm" variant="outline" onClick={() => setShowPassword(!showPassword)} className="shrink-0">
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => copy(password, "pw")} disabled={!password} className="shrink-0">
            {copiedField === "pw" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Copied</> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          The password is shown only right after it's generated. Regenerate to create a new one.
        </p>
        <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={busy} className="mt-2 -ml-2">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate Password
        </Button>
      </div>
      {FeatureGateDialog}
    </div>
  );
});

export default TeamPortalAccessSection;