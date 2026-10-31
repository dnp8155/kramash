import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle,
  AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Mail, MessageCircle, AlertTriangle, Clock, Loader2, Link2Off } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ProTag from "@/components/common/ProTag";
import { useFeatureGate } from "@/components/common/ProGate";
import { logMessage, scheduleMessage } from "@/lib/messageLogService";
import { sendClientEmail } from "@/lib/gmailService";
import { useGmailAccount } from "@/hooks/useGmailAccount";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { whatsappNumber } from "@/lib/validation";
import { workspaceTz, tzLabel, wallClockToUtcISO, defaultSendAtIn } from "@/lib/workspaceTime";
import { getTemplates, renderTemplate, templateNeedsYears, templateNeedsDoc } from "@/lib/messageTemplates";

function ChannelCard({ active, disabled, pro, icon: Icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 sm:gap-3 rounded-[15px] border p-2.5 sm:p-3 text-left transition-colors w-full min-w-0",
        active ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed hover:bg-card"
      )}
    >
      <span className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0", active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">{title}{pro && <ProTag />}</span>
        <span className="block text-xs text-muted-foreground truncate">{detail}</span>
      </span>
    </button>
  );
}

// "Send message" sheet: pick Gmail or WhatsApp (showing the client's email / number), pick a template,
// check the preview, then send now or schedule it. Templates are edited in Preferences → Business → Connections.
// `values` are the template variables for this record. WhatsApp is free; Gmail (connected, Pro) sends by itself.
export default function SendMessageDialog({ open, onClose, client, values, eventId, defaultTemplateId = "payment_reminder", docKind }) {
  const t = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { workspace } = useWorkspace();
  const { hasFeature, checkFeature, FeatureGateDialog } = useFeatureGate();
  const canEmail = hasFeature("client_email_enabled");
  // Public links to a quotation or invoice are a Pro feature (Link Sharing), so the note differs for Free.
  const canLink = hasFeature("link_sharing_enabled");
  const gmail = useGmailAccount();
  const emailReady = canEmail && gmail.connected;

  const allTemplates = useMemo(() => getTemplates(workspace, workspace?.business_category), [workspace]);
  // No year to talk about yet (event under a year old, or no event) -> no anniversary-style templates in the list.
  const hasYears = !!values?.years;
  // Send-quotation / send-invoice templates only show when a quotation or invoice is being shared.
  const hasDoc = !!values?.doc;
  const templates = useMemo(() => allTemplates.filter((tpl) => (hasYears || !templateNeedsYears(tpl)) && (hasDoc || !templateNeedsDoc(tpl))), [allTemplates, hasYears, hasDoc]);
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [channel, setChannel] = useState("whatsapp");
  const [later, setLater] = useState(false);
  const tz = workspaceTz(workspace);
  const [sendAt, setSendAt] = useState(() => defaultSendAtIn(tz));
  const [busy, setBusy] = useState(false);

  const email = (client?.email || "").trim();
  const waNumber = whatsappNumber(client?.phone);
  const current = templates.find((x) => x.id === templateId) || templates[0];

  useEffect(() => {
    if (!open) return;
    setTemplateId(templates.some((x) => x.id === defaultTemplateId) ? defaultTemplateId : templates[0]?.id);
    setChannel(waNumber || !emailReady ? "whatsapp" : email ? "email" : "whatsapp");
    setLater(false);
    setSendAt(defaultSendAtIn(tz));
    setBusy(false);
  }, [open]);

  const renderedSubject = useMemo(() => renderTemplate(current?.subject, values), [current, values]);
  const renderedBody = useMemo(() => renderTemplate(current?.body, values), [current, values]);
  const missing = [...new Set([...(channel === "email" ? renderedSubject.missing : []), ...renderedBody.missing])];

  const pickEmail = () => {
    if (!checkFeature("client_email_enabled", "Email clients from Gmail")) return;
    setChannel("email");
  };

  // Logging the message must never get in the way of sending it (for example the migration not run yet).
  const recordShared = async (recipient) => {
    try {
      await logMessage({
        workspaceId: workspace.id, eventId, clientId: client?.id, channel: "whatsapp",
        templateId: current?.id, templateName: current?.name, recipient, body: renderedBody.text, status: "shared",
      });
      qc.invalidateQueries({ queryKey: ["message_log"] });
    } catch (e) {
      console.warn("Could not log message", e);
    }
  };

  const send = async () => {
    if (missing.length) {
      toast({ title: t("Some details are missing"), description: missing.map((k) => `{${k}}`).join(", "), variant: "destructive" });
      return;
    }
    if (channel === "whatsapp" && !waNumber) { toast({ title: t("No client phone number"), variant: "destructive" }); return; }
    if (channel === "email") {
      if (!checkFeature("client_email_enabled", "Email clients from Gmail")) return;
      if (!email) { toast({ title: t("No client email"), variant: "destructive" }); return; }
      if (!emailReady) { toast({ title: t("Connect Gmail first"), description: t("Preferences → Business → Connections"), variant: "destructive" }); return; }
    }

    if (later) {
      // The time typed is in the workspace timezone, wherever the device happens to be.
      const whenISO = wallClockToUtcISO(sendAt, tz);
      if (!whenISO || new Date(whenISO).getTime() < Date.now() + 60_000) {
        toast({ title: t("Pick a time in the future"), variant: "destructive" });
        return;
      }
      setBusy(true);
      try {
        // Saved with {details} still in it; they are filled in with the latest values at the moment it is sent.
        // A quotation or invoice share is the exception: the server only knows the event, not which document this is
        // ({doc}, the link), so that text is saved already filled in.
        await scheduleMessage({
          workspaceId: workspace.id, eventId, clientId: client.id, channel,
          templateId: current?.id, templateName: current?.name,
          subject: channel === "email" ? (hasDoc ? renderedSubject.text : current?.subject) : null,
          body: hasDoc ? renderedBody.text : current?.body, sendAt: whenISO,
        });
        qc.invalidateQueries({ queryKey: ["scheduled_messages"] });
        toast({ title: t("Scheduled"), description: channel === "email" ? t("The email will be sent for you at that time.") : t("You will get a reminder to send it on WhatsApp at that time.") });
        onClose();
      } catch (e) {
        toast({ title: t("Could not schedule"), description: e?.message, variant: "destructive" });
        setBusy(false);
      }
      return;
    }

    if (channel === "whatsapp") {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(renderedBody.text)}`, "_blank");
      recordShared(client?.phone);
      onClose();
      return;
    }

    setBusy(true);
    try {
      await sendClientEmail({
        workspace_id: workspace.id, client_id: client.id, event_id: eventId || null,
        subject: renderedSubject.text, body: renderedBody.text, template_id: current?.id, template_name: current?.name,
      });
      qc.invalidateQueries({ queryKey: ["message_log"] });
      toast({ title: t("Email sent"), description: `${t("Sent from your Gmail to")} ${email}` });
      onClose();
    } catch (e) {
      toast({ title: t("Could not send email"), description: e?.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["gmail_account"] });
      setBusy(false);
    }
  };

  const emailDetail = !email
    ? t("No email on file for this client")
    : !canEmail ? email : gmail.loading ? email : emailReady ? email : t("Connect Gmail in Preferences first");

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent maxWidth="max-w-xl">
        <AppDialogHeader>
          <AppDialogTitle>{t("Send message")}</AppDialogTitle>
          <AppDialogDescription>{t("Pick a channel and a template, check the preview, then send.")}</AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">{t("Send via")}</div>
              <div className="grid grid-cols-2 gap-2">
                <ChannelCard
                  active={channel === "whatsapp"} disabled={!waNumber} icon={MessageCircle} title="WhatsApp"
                  detail={client?.phone || t("No phone number on file for this client")} onClick={() => setChannel("whatsapp")}
                />
                <ChannelCard active={channel === "email"} disabled={!email || (canEmail && !emailReady)} pro={!canEmail} icon={Mail} title="Gmail" detail={emailDetail} onClick={pickEmail} />
              </div>
              {canEmail && !gmail.loading && !gmail.connected && email && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("Gmail is not connected, so WhatsApp is selected.")} <Link to="/preferences?group=business" onClick={onClose} className="text-primary underline underline-offset-2">{t("Connect Gmail")}</Link> {t("to send emails from Kramasha.")}
                </p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">{t("Template")}</div>
              <Select value={current?.id || ""} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
              </Select>
            </div>

            <div className="rounded-[15px] border border-border bg-muted/30 p-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t("Preview")} · {channel === "email" ? email : client?.phone}
              </div>
              {channel === "email" && (
                <p className="text-sm font-semibold text-foreground break-words mb-2">{renderedSubject.text || t("(no subject)")}</p>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{renderedBody.text}</p>
              {/* Sharing a quotation or invoice whose public link is off: say so here, so nobody expects a link in the message. */}
              {hasDoc && !values?.link_line && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Link2Off className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    {canLink
                      ? <>{t(docKind === "invoice" ? "No public link is switched on for this invoice, so the message goes without one." : "No public link is switched on for this quotation, so the message goes without one.")}{" "}{t("Turn on link sharing for it to include a link.")}</>
                      : <>{t("Links to quotations and invoices are part of Pro, so this message goes without one.")} <ProTag /> <Link to="/plan" onClick={onClose} className="text-primary underline underline-offset-2">{t("See plans")}</Link></>}
                  </span>
                </p>
              )}
              {missing.length > 0 && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  {t("Missing details")}: {missing.map((k) => `{${k}}`).join(", ")}. {t("Add these to the client or event before sending.")}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} />
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {t("Send later")}
              </label>
              {later && (
                <div className="mt-2 max-w-xs">
                  <Input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">{t("Timezone as set in Preferences")}: {tzLabel(tz)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {channel === "email"
                      ? t("Kramasha sends the email for you at that time.")
                      : t("WhatsApp can't be sent for you, so you get a reminder with the message ready.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Close")}</Button>
          <Button variant="primary" onClick={send} disabled={busy || !current?.body?.trim() || (channel === "email" ? !email : !waNumber)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : later ? <Clock className="w-4 h-4" /> : channel === "email" ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {later ? t("Schedule") : channel === "email" ? t("Send email") : t("Send on WhatsApp")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
      {FeatureGateDialog}
    </AppDialog>
  );
}
