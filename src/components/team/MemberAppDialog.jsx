import { useEffect, useMemo, useState } from "react";
import { Handshake, CheckCircle2, Clock, Loader2, RotateCcw, Power, EyeOff } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { askConfirm } from "@/lib/confirmDialog";
import { useT } from "@/hooks/useT";

// "Their Kramasha app" for the whole team in one place (Team page, beside Portal access): each member's on/off switch
// and whether they accepted. Same rules as the section on a member's own page (MemberAppSection).
export default function MemberAppDialog({ open, onOpenChange, members, onChanged }) {
  const t = useT();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  // Changes made here show straight away, before the list reloads.
  const [local, setLocal] = useState({});
  // Fresh data from the server wins again (they may have accepted meanwhile).
  useEffect(() => { setLocal({}); }, [members, open]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members || [])
      .filter((m) => (m.status || "active") === "active") // inactive members are never asked
      .map((m) => ({ ...m, ...(local[m.id] || {}) }))
      .filter((m) => !q || `${m.name} ${m.email || ""}`.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.member_app_sharing) - Number(!!a.member_app_sharing) || (a.name || "").localeCompare(b.name || ""));
  }, [members, query, local]);
  const onCount = rows.filter((m) => m.member_app_sharing).length;
  const showingCount = rows.filter((m) => m.member_app_sharing && m.member_app_status === "accepted").length;

  const save = async (m, patch, message) => {
    setBusyId(m.id);
    try {
      await base44.entities.TeamMember.update(m.id, patch);
      setLocal((l) => ({ ...l, [m.id]: { ...(l[m.id] || {}), ...patch } }));
      onChanged?.();
      if (message) toast({ title: message });
    } catch (e) {
      toast({ title: t("Couldn't update"), description: /member_app/i.test(e?.message || "") ? t("This needs the latest server update. Please try again later.") : e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const turnOff = async (m) => {
    if (!(await askConfirm(t("Stop showing your bookings in {name}'s Kramasha app? They disappear from their app straight away.").replace("{name}", m.name), { title: t("Turn off?"), confirmLabel: t("Turn off"), destructive: true }))) return;
    save(m, { member_app_sharing: false }, t("Turned off"));
  };

  const statusOf = (m) => {
    if (!m.member_app_sharing) return null;
    if (m.member_app_status === "accepted") return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" />{t("Showing in their app")}</span>;
    if (m.member_app_status === "declined") return <span className="inline-flex items-center gap-1 text-muted-foreground"><EyeOff className="w-3 h-3" />{t("Not now, for them")}</span>;
    return <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" />{t("Waiting for them to accept")}</span>;
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="sm:max-w-xl">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2"><Handshake className="w-4.5 h-4.5 text-outside" />{t("Their Kramasha app")}</AppDialogTitle>
          <AppDialogDescription>
            {t("For team members who also use Kramasha: show the work you book them for inside their own app (their dates, role, venue and pay only), after they accept.")}{" "}
            {t("{on} on, {showing} showing.").replace("{on}", onCount).replace("{showing}", showingCount)}
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          {(members || []).length > 6 && <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search team members")} />}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("No team members yet.")}</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {rows.map((m) => {
                const email = (m.email || "").trim();
                const busy = busyId === m.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{email || <span className="text-warning">{t("Add their email on their page first")}</span>}</div>
                      {m.member_app_sharing && <div className="text-xs mt-0.5">{statusOf(m)}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.member_app_sharing && m.member_app_status === "declined" && (
                        <Button variant="outline" size="sm" aria-label={t("Ask again")} onClick={() => save(m, { member_app_status: null, member_app_user_id: null }, t("Asked again"))} disabled={busy}>
                          <RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t("Ask again")}</span>
                        </Button>
                      )}
                      {m.member_app_sharing ? (
                        <Button variant="outline" size="sm" onClick={() => turnOff(m)} disabled={busy}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />} {t("Turn off")}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => save(m, { member_app_sharing: true }, t("Turned on"))} disabled={busy || !email}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />} {t("Turn on")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("Done")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
