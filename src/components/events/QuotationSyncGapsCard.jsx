import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X, Users, Package, ArrowRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useT } from "@/hooks/useT";

const keyFor = (eventId) => `quote-sync-gaps:${eventId}`;
const readSeen = (eventId) => { try { return localStorage.getItem(keyFor(eventId)); } catch { return null; } };

// Shown on an event whose accepted quotation lists team or services the event doesn't have yet.
// Dismissing hides it for exactly this set of gaps; it comes back if the gaps change.
export default function QuotationSyncGapsCard({ eventId, quotationId, quotationNumber, gaps, onOpenTab, onUpdateQuotation }) {
  const t = useT();
  const replacements = gaps.replacements || [];
  const signature = [...gaps.members, ...replacements.map((r) => `${r.fromId}>${r.toId}`), ...gaps.services].join("|");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const onlyTeamChange = gaps.members.length + gaps.services.length === 0;
  const [dismissedSig, setDismissedSig] = useState(() => readSeen(eventId));

  if (!gaps.total || dismissedSig === signature) return null;

  const dismiss = () => {
    setDismissedSig(signature);
    try { localStorage.setItem(keyFor(eventId), signature); } catch { /* ignore */ }
  };

  const rows = [
    { icon: Users, tab: "Team", label: t("Quoted team not on this event"), items: gaps.members },
    { icon: Package, tab: "Services", label: t("Quoted services not on this event"), items: gaps.services },
  ].filter((r) => r.items.length > 0);

  return (
    <section className="bg-card border border-warning/60 rounded-[15px] p-3 sm:p-4 space-y-2.5" aria-label={t("Quotation sync")}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{onlyTeamChange ? t("The team differs from the quotation") : t("This event doesn't match the quotation")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {quotationNumber ? `${t("Quotation")} ${quotationNumber} ` : ""}{onlyTeamChange ? t("lists different people than the ones now on this event.") : t("and this event differ. Details below.")}
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="w-8 h-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="space-y-1.5">
        {replacements.map((r) => (
          <li key={`${r.fromId}>${r.toId}`} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-muted/40 text-sm">
            <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{t("Replaced")}{r.role ? ` · ${r.role}` : ""}</span>
              <span className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground break-words">{t("Quoted")}: <span className="line-through">{r.fromName}</span> <ArrowRight className="w-3 h-3" /> {t("Now")}: <span className="text-foreground font-medium">{r.toName}</span></span>
            </div>
            {onUpdateQuotation && <button type="button" onClick={() => setConfirm(r)} className="text-xs font-medium text-primary shrink-0">{t("Update quotation")}</button>}
          </li>
        ))}
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-muted/40 text-sm">
            <r.icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="block text-xs text-muted-foreground break-words">{r.items.join(", ")}</span>
            </div>
            <button type="button" onClick={() => onOpenTab?.(r.tab)} className="text-xs font-medium text-primary shrink-0">{t("Open")} {t(r.tab)}</button>
          </li>
        ))}
      </ul>

      {quotationId && (
        <Link to={`/quotation/${quotationId}`} className="inline-block text-xs font-medium text-primary hover:underline">
          {t("Open quotation to fix and sync again")}
        </Link>
      )}
      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o && !busy) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Update the quotation quietly?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? `${t("Replace")} ${confirm.fromName} ${t("with")} ${confirm.toName} ${t("on the quotation. Roles, dates and prices stay the same. The client is not notified and the quotation status does not change.")}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={async (e) => { e.preventDefault(); setBusy(true); try { await onUpdateQuotation(confirm); } finally { setBusy(false); setConfirm(null); } }}>{t("Update quotation")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
