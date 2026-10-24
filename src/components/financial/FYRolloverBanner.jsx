import { CalendarRange, X } from "lucide-react";
import Button from "@/components/common/Button";
import { useFYRollover } from "@/hooks/useFYRollover";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { formatDate } from "@/lib/dates";

// Dismissable heads-up that the active financial year is ending (or has ended) and the next
// one needs creating. Shown on the Financial and Events pages.
export default function FYRolloverBanner() {
  const t = useT();
  const { toast } = useToast();
  const { state, busy, dismiss, confirm } = useFYRollover();
  if (!state) return null;

  const { kind, next, ended, daysLeft, active } = state;
  const label = next.label;
  const urgent = ended || kind === "activate";

  let title;
  if (kind === "activate") title = `${label} has started`;
  else if (ended) title = `${active.fy_id.replace("FY", "FY ")} has ended`;
  else title = `Financial year ends ${daysLeft <= 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`;

  const body = kind === "activate"
    ? `Set ${label} as your active financial year so new payments and events land in it.`
    : `${ended ? "Create" : "Ready to create"} ${label} (${formatDate(next.start)} – ${formatDate(next.end)})? Nothing is created until you confirm.`;

  const onConfirm = async () => {
    try {
      await confirm();
      toast({ title: kind === "activate" ? `${label} is now active` : `${label} created` });
    } catch (e) {
      toast({ title: "Couldn't update financial year", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 sm:p-4 ${urgent ? "bg-warning/10 border-warning/40" : "bg-primary/5 border-primary/20"}`}>
      <CalendarRange className={`w-5 h-5 shrink-0 mt-0.5 ${urgent ? "text-warning" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{t(title)}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{t(body)}</p>
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" onClick={onConfirm} disabled={busy}>
            {kind === "activate" ? `${t("Set")} ${label} ${t("active")}` : `${t("Create")} ${label}`}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}>{t("Later")}</Button>
        </div>
      </div>
      <button onClick={dismiss} aria-label={t("Dismiss")} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
    </div>
  );
}
