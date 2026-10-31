import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Clock, Mail, MessageCircle, X, Send } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";
import { useToast } from "@/components/ui/use-toast";
import { listEventMessages, markMessageSent, markMessageShared, dismissReadyMessage, listEventScheduled, cancelScheduledMessage } from "@/lib/messageLogService";
import { whatsappNumber } from "@/lib/validation";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { workspaceTz, formatInTz } from "@/lib/workspaceTime";
import MessageLogList from "@/components/messaging/MessageLogList";

// Activity tab: every message sent to the client about this event and where it stands, plus what is
// still scheduled. Automatic ones carry an "Auto" tag.
export default function EventMessagesCard({ workspaceId, eventId }) {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tz = workspaceTz(useWorkspace().workspace);
  const enabled = !!workspaceId && !!eventId;
  const { data: messages = [] } = useQuery({
    queryKey: ["message_log", workspaceId, eventId],
    queryFn: () => listEventMessages(workspaceId, eventId),
    enabled,
  });
  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled_messages", workspaceId, eventId],
    queryFn: () => listEventScheduled(workspaceId, eventId),
    enabled,
  });

  const fail = (e) => toast({ title: t("Failed to update"), description: e?.message, variant: "destructive" });
  const markSent = async (m) => {
    try { await markMessageSent(m.id); qc.invalidateQueries({ queryKey: ["message_log"] }); } catch (e) { fail(e); }
  };
  const cancel = async (s) => {
    try { await cancelScheduledMessage(s.id); qc.invalidateQueries({ queryKey: ["scheduled_messages"] }); } catch (e) { fail(e); }
  };

  // Due WhatsApp messages: the text is shown in full with a button that opens WhatsApp with it filled in.
  const ready = messages.filter((m) => m.status === "ready");
  const others = messages.filter((m) => m.status !== "ready");
  const openWhatsApp = async (m) => {
    const num = whatsappNumber(m.recipient);
    if (!num) { toast({ title: t("No client phone number"), variant: "destructive" }); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(m.body || "")}`, "_blank");
    try { await markMessageShared(m.id); qc.invalidateQueries({ queryKey: ["message_log"] }); } catch (e) { fail(e); }
  };

  const dismiss = async (m) => {
    try {
      await dismissReadyMessage(m);
      qc.invalidateQueries({ queryKey: ["message_log"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) { fail(e); }
  };

  const empty = messages.length === 0 && scheduled.length === 0;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-foreground" />
        <span className="text-sm font-semibold text-foreground">{t("Messages")}</span>
        {messages.length > 0 && <span className="text-xs text-muted-foreground">({messages.length})</span>}
      </div>

      {ready.length > 0 && (
        <ul className="space-y-3 mb-3">
          {ready.map((m) => (
            <li key={m.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{m.template_name || t("WhatsApp message")}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">{t("Ready to send")}</span>
                <button type="button" onClick={() => dismiss(m)} aria-label={t("Close")} title={t("Don't send")} className="ml-auto -mr-1 -mt-1 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-anywhere rounded-lg bg-card border border-border p-2.5">{m.body}</p>
              <Button size="sm" className="mt-2" onClick={() => openWhatsApp(m)}><Send className="w-3.5 h-3.5" /> {t("Send on WhatsApp")}</Button>
            </li>
          ))}
        </ul>
      )}

      {scheduled.length > 0 && (
        <ul className="divide-y divide-border mb-1">
          {scheduled.map((s) => {
            const Icon = s.channel === "email" ? Mail : MessageCircle;
            return (
              <li key={s.id} className="py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-muted-foreground" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{s.template_name || t("Message")}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/10 text-warning inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t("Scheduled")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatInTz(s.send_at, tz)}{s.channel === "whatsapp" ? ` · ${t("you'll get a reminder")}` : ""}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => cancel(s)}><X className="w-3.5 h-3.5" /> {t("Cancel")}</Button>
              </li>
            );
          })}
        </ul>
      )}

      {empty
        ? <p className="text-sm text-muted-foreground">{t("Nothing sent to the client yet. Use Send message above.")}</p>
        : others.length > 0 && <MessageLogList messages={others} onMarkSent={markSent} />}
    </Card>
  );
}
