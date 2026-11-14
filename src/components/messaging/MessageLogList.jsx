import { Mail, MessageCircle, Check } from "lucide-react";
import Button from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { formatRelativeTime } from "@/lib/dates";
import { describeMessageStatus, CHANNEL_LABEL } from "@/lib/messageLogService";

const TONE = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

// One line per message: channel, template, who it went to, and where it stands (Shared / Sent /
// Likely opened / Link clicked / Replied / Failed). WhatsApp rows stay "Shared" until the studio
// confirms it was sent, because Kramasha cannot see inside WhatsApp.
export default function MessageLogList({ messages, onMarkSent, clientNames, eventTitles }) {
  const t = useT();
  return (
    <ul className="divide-y divide-border">
      {messages.map((m) => {
        const st = describeMessageStatus(m);
        const Icon = m.channel === "email" ? Mail : MessageCircle;
        return (
          <li key={m.id} className="py-3 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground break-anywhere">{m.template_name || t(CHANNEL_LABEL[m.channel] || "Message")}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", TONE[st.tone])}>{t(st.label)}</span>
                {m.automated && <span title={t("Sent automatically")} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-accent-foreground border border-border">{t("Auto")}</span>}
              </div>
              <div className="text-xs text-muted-foreground break-anywhere leading-relaxed mt-0.5">
                {eventTitles?.[m.event_id] ? `${eventTitles[m.event_id]} · ` : ""}{t(CHANNEL_LABEL[m.channel] || m.channel)} · {clientNames?.[m.client_id] || m.recipient}
                {st.at ? ` · ${formatRelativeTime(st.at)}` : ""}
              </div>
              {m.status === "failed" && m.error && <div className="text-xs text-destructive mt-0.5">{m.error}</div>}
            </div>
            {m.channel === "whatsapp" && m.status === "shared" && onMarkSent && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => onMarkSent(m)}><Check className="w-3.5 h-3.5" /> {t("Mark sent")}</Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
