import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2 } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { useMemberAppInvites, useRefreshOutsideWork, respondMemberAppLink } from "@/lib/outsideWork";

// Asked once per business: a business that uses Kramasha added this person to their team (with this verified email)
// and turned on "Show my bookings in their Kramasha app". Nothing of theirs shows until this person says yes.
// "Not now" hides it; they can show it later from Work from others.
export default function OutsideWorkInvite() {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const refresh = useRefreshOutsideWork();
  const { data: invites = [] } = useMemberAppInvites();
  const next = invites.find((i) => i.status == null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  // Wait until no other sheet is open (welcome sheet, update prompts…), then ask.
  useEffect(() => {
    if (!next) { setOpen(false); return undefined; }
    let tries = 0;
    let timer;
    const tryOpen = () => {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]') && tries++ < 120) { timer = setTimeout(tryOpen, 1000); return; }
      setOpen(true);
    };
    timer = setTimeout(tryOpen, 1500);
    return () => clearTimeout(timer);
  }, [next?.member_id]);

  if (!next) return null;

  const answer = async (accept) => {
    setBusy(accept ? "yes" : "no");
    try {
      await respondMemberAppLink(next.member_id, accept);
      setOpen(false);
      await refresh();
      if (accept) {
        toast({ title: t("Bookings added"), description: t("Now in Work from others and on your calendar. Your totals from all businesses are at the top of that page.") });
        navigate("/outside-work");
      }
    } catch (e) {
      toast({ title: t("Couldn't update"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(v) => { if (!busy && !v) setOpen(false); }}>
      <AppDialogContent maxWidth="max-w-sm">
        <AppDialogHeader className="items-center text-center">
          {next.workspace_logo
            ? <img src={next.workspace_logo} alt="" className="mx-auto mb-2 w-14 h-14 rounded-full object-cover border border-border" />
            : <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-outside/10 text-outside text-xl font-bold flex items-center justify-center">{String(next.workspace_name || "?").charAt(0).toUpperCase()}</div>}
          <AppDialogTitle className="pr-0">{t("{name} added you to their team").replace("{name}", next.workspace_name)}</AppDialogTitle>
          <AppDialogDescription className="pr-0">{t("See the jobs they book you for in your app?")}</AppDialogDescription>
        </AppDialogHeader>
        <ul className="px-6 pb-2 space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />{t("Dates, role and venue, on your calendar")}</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />{t("Your pay, payments and receipts")}</li>
          <li className="flex items-start gap-2 text-muted-foreground"><X className="w-4 h-4 shrink-0 mt-0.5" />{t("Their clients and prices stay private")}</li>
        </ul>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => answer(false)} disabled={!!busy}>{busy === "no" && <Loader2 className="w-4 h-4 animate-spin" />}{t("Not now")}</Button>
          <Button onClick={() => answer(true)} disabled={!!busy}>{busy === "yes" && <Loader2 className="w-4 h-4 animate-spin" />}{t("Show their bookings")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
