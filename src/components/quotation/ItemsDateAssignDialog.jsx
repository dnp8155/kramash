import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from "@/components/ui/AppDialog";
import { Layers, CalendarDays, List } from "lucide-react";
import { formatDateChip } from "@/lib/quotationCalc";
import { useT } from "@/hooks/useT";

function Choice({ icon: Icon, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg border border-border text-left transition-colors cursor-pointer sm:hover:bg-muted/40 sm:hover:border-primary"
    >
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
      </div>
    </button>
  );
}

// Asked when items without a date (e.g. carried over from the Rate Estimator) meet a date range,
// so they don't silently sit under "General" next to the day cards.
export default function ItemsDateAssignDialog({ open, itemCount, dates = [], onChoose }) {
  const t = useT();
  const first = dates[0];
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onChoose("keep")}>
      <AppDialogContent maxWidth="max-w-md" hideClose>
        <AppDialogHeader>
          <AppDialogTitle>{t("Where should these items go?")}</AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {itemCount} {t("item(s) have no date yet. You've set")} {dates.length} {t("date(s) — choose how to place them.")}
          </p>
          <Choice
            icon={Layers}
            title={t("Copy to every date")}
            hint={`${t("Each of the")} ${dates.length} ${t("dates gets the full list, so the total is multiplied.")}`}
            onClick={() => onChoose("copy")}
          />
          <Choice
            icon={CalendarDays}
            title={first ? `${t("Move all to")} ${formatDateChip(first)}` : t("Move all to the first date")}
            hint={t("Everything is placed on the first date; you can duplicate or edit days later.")}
            onClick={() => onChoose("first")}
          />
          <Choice
            icon={List}
            title={t("Keep under General")}
            hint={t("Leave the items undated, as one list.")}
            onClick={() => onChoose("keep")}
          />
        </AppDialogBody>
      </AppDialogContent>
    </AppDialog>
  );
}
