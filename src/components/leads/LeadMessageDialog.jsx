import { useState, useEffect, useMemo } from "react";
import { openWhatsApp } from "@/lib/openWhatsApp";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ProTag from "@/components/common/ProTag";
import { useFeatureGate } from "@/components/common/ProGate";
import { useGmailAccount } from "@/hooks/useGmailAccount";
import { sendClientEmail } from "@/lib/gmailService";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";
import { MESSAGE_TEMPLATES } from "@/constants/leadConfig";
import { buildLeadMessage, leadDates } from "@/lib/leadManager";
import { markLeadContacted } from "@/lib/leadService";
import { whatsappShareUrl } from "@/lib/portalShare";
import { whatsappNumber } from "@/lib/validation";
import { formatDatesList } from "@/lib/dates";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Share2, Copy, CheckCircle2, Check, Mail, Loader2 } from "lucide-react";

// Ready-to-send message for a lead: pick a template, adjust the text, then open WhatsApp, send it by email
// (channel "email": from the connected Gmail, Pro) or copy it.
// Sending (or copying) is noted on the lead's timeline and moves a "New" lead to "Contacted".
export default function LeadMessageDialog({ open, lead, channel = "whatsapp", onClose }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspace, workspaceId } = useWorkspace();
  const { hasFeature, checkFeature, FeatureGateDialog } = useFeatureGate();
  const gmail = useGmailAccount();
  const isEmail = channel === "email";
  const canEmail = hasFeature("client_email_enabled");
  const emailReady = canEmail && gmail.connected;
  const email = String(lead?.email || "").trim();
  const [key, setKey] = useState("intro");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const dates = useMemo(() => leadDates(lead), [lead]);
  const fill = (k) => buildLeadMessage(k, { lead, business: workspace?.name || "", dateText: dates.length ? formatDatesList(dates) : "" });
  const subjectFor = (k) => `${t(MESSAGE_TEMPLATES.find((m) => m.key === k)?.label || "")}${workspace?.name ? ` · ${workspace.name}` : ""}`;

  useEffect(() => {
    if (!open || !lead) return;
    const first = lead.status === "new" ? "intro" : "followup";
    setKey(first);
    setText(fill(first));
    setSubject(subjectFor(first));
    setCopied(false);
    setBusy(false);
  }, [open, lead?.id]);

  const pick = (k) => { setKey(k); setText(fill(k)); setSubject(subjectFor(k)); setCopied(false); };

  const noteSent = async (kind = "whatsapp") => {
    try {
      const advanced = await markLeadContacted(workspaceId, lead, kind, MESSAGE_TEMPLATES.find((m) => m.key === key)?.label || "");
      invalidateEntities(queryClient, ["Lead"]);
      queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      if (advanced) toast({ title: t("Marked as contacted") });
    } catch { /* the message itself still went out */ }
  };

  const openWhatsapp = () => {
    openWhatsApp(whatsappShareUrl(whatsappNumber(lead?.phone), text));
    noteSent();
    onClose();
  };
  const sendEmail = async () => {
    if (!checkFeature("client_email_enabled", "Email clients from Gmail")) return;
    if (!emailReady) { toast({ title: t("Connect Gmail first"), description: t("Preferences → Business → Connections"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      await sendClientEmail({
        workspace_id: workspaceId, lead_id: lead.id, subject: subject.trim(), body: text,
        template_id: `lead_${key}`, template_name: MESSAGE_TEMPLATES.find((m) => m.key === key)?.label || null,
      });
      queryClient.invalidateQueries({ queryKey: ["message_log"] });
      toast({ title: t("Email sent"), description: `${t("Sent from your Gmail to")} ${email}` });
      noteSent("email");
      onClose();
    } catch (e) {
      toast({ title: t("Could not send email"), description: e?.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["gmail_account"] });
      setBusy(false);
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(isEmail ? `${subject}\n\n${text}` : text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); noteSent(isEmail ? "email" : "whatsapp"); })
      .catch(() => toast({ title: t("Could not copy link"), variant: "destructive" }));
  };

  const description = isEmail
    ? (email || t("No email saved for this lead."))
    : (lead?.phone ? lead.phone : t("No phone number saved — you can still copy the message."));

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">{isEmail ? t("Email") : t("Message")} — {lead?.name}{isEmail && !canEmail && <ProTag />}</AppDialogTitle>
          <AppDialogDescription>{description}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          {isEmail && canEmail && !gmail.loading && !gmail.connected && (
            <p className="text-xs text-muted-foreground">
              {t("Gmail is not connected.")} <Link to="/preferences?group=business" onClick={onClose} className="text-primary underline underline-offset-2">{t("Connect Gmail")}</Link> {t("to send emails from Kramasha.")}
            </p>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Message type")}</label>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_TEMPLATES.map((m) => {
                const selected = key === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => pick(m.key)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    {t(m.label)}
                  </button>
                );
              })}
            </div>
          </div>
          {isEmail && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Subject")}</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Message")}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="outline" onClick={copy}>
            {copied ? <><CheckCircle2 className="w-4 h-4 text-success" /> {t("Copied")}</> : <><Copy className="w-4 h-4" /> {t("Copy")}</>}
          </Button>
          {isEmail ? (
            <Button onClick={sendEmail} disabled={busy || !email || !text.trim() || (canEmail && !gmail.loading && !gmail.connected)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} {t("Send email")}
            </Button>
          ) : (
            <Button onClick={openWhatsapp} disabled={!lead?.phone || !text.trim()}>
              <Share2 className="w-4 h-4" /> WhatsApp
            </Button>
          )}
        </AppDialogFooter>
      </AppDialogContent>
      {FeatureGateDialog}
    </AppDialog>
  );
}
