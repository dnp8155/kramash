import { useEffect, useMemo, useState } from "react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle,
  AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Copy, CheckCircle2, Share2, MapPin, Clock, Link2, StickyNote, MessageCircle, Plus, Check } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { currencyIcon } from "@/utils/currencyIcon";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

const fmtTime = (hhmm) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

function Chip({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
        active ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border text-foreground hover:bg-muted"
      )}
    >
      {active ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

// Shows the booking message for a team member or a service as a card with a Copy button, plus chips that add
// extra lines to it (location, map link, reporting time, amount, a note). `target` = { kind, name, rate, datesLabel }.
export default function ShareAssignmentTextDialog({ open, onClose, target, event, term, currency }) {
  const t = useT();
  const CurrencyIcon = currencyIcon(currency);
  const [opts, setOpts] = useState({});
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) { setOpts({ amount: true }); setTime(""); setNote(""); setMapLink(""); setCopied(false); }
  }, [open, target]);

  const toggle = (k) => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const place = [event?.venue, event?.venue_address].filter(Boolean).join(", ");

  const text = useMemo(() => {
    if (!target) return "";
    const amount = opts.amount ? ` for the amount of ${formatMoney(target.rate, currency)}` : "";
    let first;
    if (target.kind === "service") {
      // Greets the provider by name; with no provider it still reads as a complete sentence.
      first = target.name
        ? `Hi ${target.name}, you are assigned for ${target.serviceName} on ${target.datesLabel}${amount}.`
        : `Hi, ${target.serviceName} is booked on ${target.datesLabel}${amount}.`;
    } else {
      first = `Hi ${target.name}, you are booked for ${target.datesLabel}${amount}.`;
    }
    const lines = [first];
    lines.push(`${term.workItemSingular}: ${event?.title || ""}`);
    if (opts.time && time) lines.push(`Reporting time: ${fmtTime(time)}`);
    if (opts.location && place) lines.push(`${term.locationLabel || "Venue"}: ${place}`);
    if (opts.maps && mapLink.trim()) lines.push(`Map: ${mapLink.trim()}`);
    if (opts.note && note.trim()) lines.push(note.trim());
    return lines.join("\n");
  }, [target, opts, time, note, mapLink, place, term, event, currency]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  const nativeShare = async () => { try { await navigator.share({ text }); } catch { /* cancelled */ } };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent maxWidth="max-w-lg">
        <AppDialogHeader>
          <AppDialogTitle>{t("Share Details")}</AppDialogTitle>
          <AppDialogDescription>{t("Add what they need to know, then copy or send the message.")}</AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody>
          <div className="space-y-4">
            <div className="rounded-[15px] border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{text}</p>
              <Button size="sm" variant="outline" onClick={copy} className="mt-3 w-full">
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t("Copied")}</> : <><Copy className="w-3.5 h-3.5" /> {t("Copy text")}</>}
              </Button>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">{t("Add to message")}</div>
              <div className="flex flex-wrap gap-2">
                <Chip active={!!opts.amount} icon={CurrencyIcon} onClick={() => toggle("amount")}>{t("Amount")}</Chip>
                {place && <Chip active={!!opts.location} icon={MapPin} onClick={() => toggle("location")}>{t("Add location")}</Chip>}
                <Chip active={!!opts.maps} icon={Link2} onClick={() => toggle("maps")}>{t("Map link")}</Chip>
                <Chip active={!!opts.time} icon={Clock} onClick={() => toggle("time")}>{t("Add custom time")}</Chip>
                <Chip active={!!opts.note} icon={StickyNote} onClick={() => toggle("note")}>{t("Add note")}</Chip>
              </div>
              {!place && <p className="text-[11px] text-muted-foreground mt-2">{t("Add a venue to this project to include location and map link.")}</p>}
            </div>

            {opts.maps && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{t("Map link")}</div>
                <Input type="url" inputMode="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder={t("Paste your Google Maps link")} />
              </div>
            )}
            {opts.time && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{t("Reporting time")}</div>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            )}
            {opts.note && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">{t("Note")}</div>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. Please bring the extra lens")} />
              </div>
            )}
          </div>
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Close")}</Button>
          <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")}>
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
          {typeof navigator !== "undefined" && navigator.share && (
            <Button variant="primary" onClick={nativeShare}><Share2 className="w-4 h-4" /> {t("Share")}</Button>
          )}
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
