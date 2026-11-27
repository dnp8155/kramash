import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Handshake, CheckCircle2, Clock, Loader2, Power, RotateCcw, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import { askConfirm } from "@/lib/confirmDialog";
import { formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";

// "Their Kramasha app" on a team member's page (beside Quick Portal Access): one switch that shows the work you book
// this person for inside their OWN Kramasha app (Work from others), read-only and only after they accept. Free.
// The answer (accepted / declined) can only come from them; you can turn it off or ask again.
export default function MemberAppSection({ member, workspaceId }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(!!member.member_app_sharing);
  const [status, setStatus] = useState(member.member_app_status || null);
  // Follow the saved row (an email change resets the answer; they may accept while this page is open).
  useEffect(() => { setOn(!!member.member_app_sharing); setStatus(member.member_app_status || null); }, [member.member_app_sharing, member.member_app_status]);
  const email = (member.email || "").trim();
  const name = member.name || t("This team member");

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ["team-member", member.id, workspaceId] });
    invalidateEntities(queryClient, ["TeamMember"]);
  };

  const save = async (patch, done) => {
    setBusy(true);
    try {
      await base44.entities.TeamMember.update(member.id, patch);
      done();
      reload();
    } catch (e) {
      toast({ title: t("Couldn't update"), description: /member_app/i.test(e?.message || "") ? t("This needs the latest server update. Please try again later.") : e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () => save({ member_app_sharing: true }, () => {
    setOn(true);
    toast({ title: t("Turned on"), description: status === "accepted" ? t("Your bookings show in {name}'s app again.").replace("{name}", name) : t("{name} will be asked in their Kramasha app.").replace("{name}", name) });
  });
  const turnOff = async () => {
    if (!(await askConfirm(t("Remove your bookings from {name}'s app?").replace("{name}", name), { title: t("Turn off?"), confirmLabel: t("Turn off"), destructive: true }))) return;
    save({ member_app_sharing: false }, () => { setOn(false); toast({ title: t("Turned off") }); });
  };
  const askAgain = () => save({ member_app_status: null, member_app_user_id: null }, () => {
    setStatus(null);
    toast({ title: t("Asked again"), description: t("{name} will be asked once more in their app.").replace("{name}", name) });
  });

  const head = (
    <div className="flex items-start gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-outside/10" : "bg-muted"}`}>
        <Handshake className={`w-4.5 h-4.5 ${on ? "text-outside" : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{t("Their Kramasha app")}</div>
        {!on && <p className="text-xs text-muted-foreground mt-0.5">{t("If {name} uses Kramasha, show their bookings in their own app, once they accept.").replace("{name}", name)}</p>}
      </div>
    </div>
  );

  if (!on) {
    return (
      // Same layout as Quick Portal Access when it's off: icon, then the text with the button under it (phones) or
      // beside it (large screens).
      <div className="bg-card border border-border rounded-[15px] p-4">
        <div className="flex items-start gap-3 lg:items-center">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Handshake className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{t("Their Kramasha app")}</div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3 lg:mb-0">
                {t("If {name} uses Kramasha, show their bookings in their own app, once they accept.").replace("{name}", name)}
              </p>
            </div>
            <Button size="sm" className="lg:shrink-0" onClick={turnOn} disabled={busy || !email}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
              {t("Turn on")}
            </Button>
          </div>
        </div>
        {!email && (
          <p className="mt-2 text-xs text-warning flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />{t("Add the email {name} uses for Kramasha first.").replace("{name}", name)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[15px] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        {head}
        <Button variant="destructive" size="sm" onClick={turnOff} disabled={busy} className="shrink-0">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />} {t("Turn off")}
        </Button>
      </div>
      <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-xs space-y-1">
        {status === "accepted" ? (
          <div className="flex items-center gap-1.5 text-success font-medium"><CheckCircle2 className="w-3.5 h-3.5" />{t("Showing in their app")}{member.member_app_responded_at ? ` ${t("since")} ${formatDate(String(member.member_app_responded_at).slice(0, 10))}` : ""}</div>
        ) : status === "declined" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{t("{name} chose not to show it for now.").replace("{name}", name)}</span>
            <Button variant="outline" size="sm" onClick={askAgain} disabled={busy}><RotateCcw className="w-3.5 h-3.5" /> {t("Ask again")}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-foreground"><Clock className="w-3.5 h-3.5 text-muted-foreground" />{t("Waiting for {name} to accept.").replace("{name}", name)}</div>
        )}
        <div className="text-muted-foreground">{t("Matched by email")}: <span className="text-foreground">{email}</span>. {t("They see only their own dates, role, venue and pay.")}</div>
      </div>
    </div>
  );
}
