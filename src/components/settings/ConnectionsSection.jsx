import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Button from "@/components/common/Button";
import ProTag from "@/components/common/ProTag";
import { useFeatureGate } from "@/components/common/ProGate";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useGmailAccount } from "@/hooks/useGmailAccount";
import { startGmailConnect, disconnectGmail } from "@/lib/gmailService";
import { jumpBackAfterOAuth, takeOAuthResult, onOAuthPageShow } from "@/lib/oauthReturn";
import { countPendingScheduled } from "@/lib/messageLogService";
import { askConfirm } from "@/lib/confirmDialog";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import MessageTemplatesManager from "@/components/settings/MessageTemplatesManager";
import AutomationManager from "@/components/settings/AutomationManager";

function ConnectionCard({ icon: Icon, title, status, ok, warn, pro, description, detail, action, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {pro && <ProTag />}
          {status && <span className={ok ? "text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success inline-flex items-center gap-1" : warn ? "text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning" : "text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"}>
            {ok && <CheckCircle2 className="w-3 h-3" />}{status}
          </span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        {detail && <p className="text-sm font-medium text-foreground mt-2 break-all">{detail}</p>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
        {children}
      </div>
    </div>
  );
}

const RETURN_MESSAGES = {
  connected: { title: "Gmail connected" },
  denied: { title: "Gmail was not connected", description: "You cancelled on the Google screen.", variant: "destructive" },
  error: { title: "Could not connect Gmail", description: "Please try again.", variant: "destructive" },
};
const REASONS = {
  permission: "Please allow “Send email on your behalf” on the Google screen.",
  expired: "That sign-in link expired. Please try again.",
  no_token: "Google did not give permission to send later. Disconnect Kramasha in your Google account's third-party access, then try again.",
};

// Preferences → Business → Connections: the channels used to message clients.
// WhatsApp is a share link (free); connecting Gmail to send email is a Pro feature.
export default function ConnectionsSection() {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { workspaceId, workspace } = useWorkspace();
  const { hasFeature, checkFeature, FeatureGateDialog } = useFeatureGate();
  const canEmail = hasFeature("client_email_enabled");
  const gmail = useGmailAccount();
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  // Google sends the person back here with ?gmail=connected (or denied / error).
  const showResult = (p) => {
    const m = RETURN_MESSAGES[p.get("gmail")];
    if (m) toast({ ...m, description: REASONS[p.get("reason")] || m.description });
    qc.invalidateQueries({ queryKey: ["gmail_account"] });
  };
  const tidyAddress = () => {
    const next = new URLSearchParams(window.location.search);
    next.delete("gmail"); next.delete("reason");
    setParams(next, { replace: true });
  };
  // Same as Instagram: jump back over the Google pages to the page we left from, so Back never lands on a sign-in screen.
  useEffect(() => {
    if (params.get("gmail")) {
      if (jumpBackAfterOAuth()) {
        const t = setTimeout(() => {
          const saved = takeOAuthResult("gmail");
          if (saved) { showResult(new URLSearchParams(saved)); tidyAddress(); }
        }, 2000);
        return () => clearTimeout(t);
      }
      showResult(params);
      tidyAddress();
      return undefined;
    }
    const saved = takeOAuthResult("gmail");
    if (saved) showResult(new URLSearchParams(saved));
    return onOAuthPageShow(() => {
      const again = takeOAuthResult("gmail");
      if (again) showResult(new URLSearchParams(again));
    });
  }, []);

  const connect = async () => {
    setBusy(true);
    try { await startGmailConnect(workspaceId); } catch (e) {
      toast({ title: t("Could not start Gmail connect"), description: e?.message, variant: "destructive" });
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    let pending = 0;
    try { pending = await countPendingScheduled(workspaceId, "email"); } catch { /* still ask, just without the count */ }
    const warning = pending > 0
      ? ` ${pending === 1 ? t("1 scheduled email is waiting and won't be sent") : `${pending} ${t("scheduled emails are waiting and won't be sent")}`} ${t("while Gmail is disconnected.")}`
      : "";
    if (!await askConfirm(`${t("Disconnect Gmail? Emails, including automatic ones, will pause until you connect again.")}${warning}`, { confirmLabel: t("Disconnect"), destructive: true })) { setBusy(false); return; }
    try {
      await disconnectGmail(workspaceId);
      qc.invalidateQueries({ queryKey: ["gmail_account"] });
      toast({ title: t("Gmail disconnected") });
    } catch (e) {
      toast({ title: t("Failed to disconnect"), description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // One small row, the same look as the Instagram connect card on My Profile: state on the left, button on the right.
  let left = <><Mail className="w-4 h-4 shrink-0" /><span>{t("Not connected")}</span></>;
  let button = null;
  if (!canEmail) {
    button = <Button size="sm" variant="outline" onClick={() => checkFeature("client_email_enabled", "Email clients from Gmail")}>{t("Upgrade to connect Gmail")}</Button>;
  } else if (gmail.loading) {
    left = <><Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /><span>{t("Checking…")}</span></>;
  } else if (!gmail.configured) {
    left = <><Mail className="w-4 h-4 shrink-0" /><span>{t("Not set up yet")}</span></>;
  } else if (gmail.connected) {
    left = <><CheckCircle2 className="w-4 h-4 text-success shrink-0" /><span className="truncate text-foreground">{t("Connected as")} <b>{gmail.email}</b></span></>;
    button = <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("Disconnect")}</Button>;
  } else {
    if (gmail.needsReconnect) left = <><AlertTriangle className="w-4 h-4 text-warning shrink-0" /><span>{t("The Gmail connection has expired. Connect again.")}</span></>;
    button = (
      <Button size="sm" disabled={busy} onClick={connect}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Mail className="w-3.5 h-3.5" /> {gmail.needsReconnect ? t("Reconnect") : t("Connect")}</>}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <ConnectionCard
        icon={MessageCircle}
        title="WhatsApp"
        description={t("Always ready, with nothing to set up. Tap Send message on any event and WhatsApp opens with your message already written. Just hit Send. We can't see inside WhatsApp, so it shows as Shared until you mark it Sent.")}
      >
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 min-w-0 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span className="truncate text-foreground">{workspace?.phone ? <>{t("Ready on")} <b>{workspace.phone}</b></> : t("Ready")}</span>
        </div>
      </ConnectionCard>
      <ConnectionCard
        icon={Mail}
        title="Gmail"
        pro={!canEmail}
        description={t("Email your clients right from Kramasha, using your own Gmail. Emails go from your address and show up in your Sent folder. We only send, and never read your inbox.")}
      >
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">{left}</div>
          {button}
        </div>
      </ConnectionCard>
      <MessageTemplatesManager />
      <AutomationManager gmail={gmail} />
      {FeatureGateDialog}
    </div>
  );
}
