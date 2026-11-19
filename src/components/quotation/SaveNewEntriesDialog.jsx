import { useState } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { Users, Package, BadgeCheck } from "lucide-react";
import { useT } from "@/hooks/useT";

const ICON = { role: BadgeCheck, member: Users, service: Package };

// Shown at finalize when custom lines used a role, member or service that isn't saved yet. Ticked ones are added to
// Team / Services (so the event can get their cards); unticked stay on this quotation only.
export default function SaveNewEntriesDialog({ entries = [], busy, onSave, onSkip }) {
  const t = useT();
  const [off, setOff] = useState(() => new Set());
  const label = { role: t("Role"), member: t("Team member"), service: t("Service") };
  const toggle = (k) => setOff((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const chosen = entries.filter((e) => !off.has(e.key));
  return (
    <AppDialog open={entries.length > 0} onOpenChange={(o) => !o && !busy && onSkip()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader><AppDialogTitle>{t("Save new items to your lists?")}</AppDialogTitle></AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {t("These were added as custom items. Save them as team or services so they can be reused and get event cards.")}
          </p>
          <div className="space-y-1.5">
            {entries.map((e) => {
              const Icon = ICON[e.kind];
              return (
                <label key={e.key} className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={!off.has(e.key)} onChange={() => toggle(e.key)} className="rounded" />
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{e.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{label[e.kind]}{e.kind === "member" && e.role ? ` · ${e.role}` : ""}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onSkip} disabled={busy}>{t("Skip")}</Button>
          <Button variant="dark" onClick={() => onSave(chosen)} disabled={busy || chosen.length === 0}>{busy ? t("Saving…") : t("Save & continue")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
