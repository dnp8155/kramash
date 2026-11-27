import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

// Asks before an accepted quotation creates (mode "create") or re-syncs (mode "resync")
// its event/project. Nothing is created or changed until the owner confirms.
export default function SyncEventDialog({ mode, busy, onConfirm, onLater, openSlots = [], combined = null }) {
  const t = useT();
  const item = useBusinessTerminology().workItemSingular.toLowerCase(); // "event", "project", "shoot"…
  const isCreate = mode === "create";
  return (
    <AppDialog open={!!mode} onOpenChange={(o) => !o && !busy && onLater()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{isCreate ? t("Create an event for this quotation?") : t("Re-sync the event with this quotation?")}</AppDialogTitle>
          <AppDialogDescription>
            {isCreate
              ? t("This quotation has been accepted but has no event/project yet. Create one with the same dates, team, services (at the quoted rates), payment milestones and total? You can edit everything on the event later.")
              : t("This re-applies the accepted quotation to its event: dates, total, team and service rates and payment milestones. The event's title is kept. Rates or dates you changed on the event will be overwritten.")}
          </AppDialogDescription>
        </AppDialogHeader>
        {combined && (
          <div className="mx-6 mb-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            <p className="font-medium">{t("This {item} also has").replace("{item}", item)} {combined.others.join(", ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("The {item} uses all its accepted quotations together: every date, the team and services of each, and a total of").replace("{item}", item)} {combined.total}. {t("If one of them was replaced by this quotation, mark it as Cancelled first.")}
            </p>
          </div>
        )}
        {openSlots.length > 0 && (
          <div className="mx-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-medium">{openSlots.length === 1 ? t("1 role has no person yet") : `${openSlots.length} ${t("roles have no person yet")}`}</p>
            <ul className="mt-1.5 space-y-0.5 list-disc pl-5 text-xs">
              {openSlots.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="mt-2 text-xs">{t("These roles will show on the event as \"No member selected\" cards. Sync now, then add a team member for each one on the event.")}</p>
          </div>
        )}
        <AppDialogFooter>
          <Button variant="outline" onClick={onLater} disabled={busy}>{t("Not now")}</Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? t("Syncing…") : isCreate ? t("Create event") : t("Re-sync")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
