import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
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
import { Share2, Copy, CheckCircle2, Check } from "lucide-react";

// Ready-to-send message for a lead: pick a template, adjust the text, then open WhatsApp or copy it.
// Sending (or copying) is noted on the lead's timeline and moves a "New" lead to "Contacted".
export default function LeadMessageDialog({ open, lead, onClose }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspace, workspaceId } = useWorkspace();
  const [key, setKey] = useState("intro");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const dates = useMemo(() => leadDates(lead), [lead]);
  const fill = (k) => buildLeadMessage(k, { lead, business: workspace?.name || "", dateText: dates.length ? formatDatesList(dates) : "" });

  useEffect(() => {
    if (!open || !lead) return;
    const first = lead.status === "new" ? "intro" : "followup";
    setKey(first);
    setText(fill(first));
    setCopied(false);
  }, [open, lead?.id]);  

  const pick = (k) => { setKey(k); setText(fill(k)); setCopied(false); };

  const noteSent = async () => {
    try {
      const advanced = await markLeadContacted(workspaceId, lead, "whatsapp", MESSAGE_TEMPLATES.find((m) => m.key === key)?.label || "");
      invalidateEntities(queryClient, ["Lead"]);
      queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      if (advanced) toast({ title: t("Marked as contacted") });
    } catch { /* the message itself still went out */ }
  };

  const openWhatsapp = () => {
    window.open(whatsappShareUrl(whatsappNumber(lead?.phone), text), "_blank");
    noteSent();
    onClose();
  };
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); noteSent(); })
      .catch(() => toast({ title: t("Could not copy link"), variant: "destructive" }));
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{t("Message")} — {lead?.name}</AppDialogTitle>
          <AppDialogDescription>{lead?.phone ? lead.phone : t("No phone number saved — you can still copy the message.")}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
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
          <Button onClick={openWhatsapp} disabled={!lead?.phone || !text.trim()}>
            <Share2 className="w-4 h-4" /> WhatsApp
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
