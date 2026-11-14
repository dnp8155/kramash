import { PartyPopper } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Toggle from "@/components/common/Toggle";
import { holidayCountryLabel } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// "Holidays" pill under the Team calendar. Same setting as Preferences → Region Settings: a change here is saved there too.
export default function HolidayMenu({ holidays }) {
  const t = useT();
  const { on, country, regional, loading, change } = holidays;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "no-press h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-colors",
            on ? "border-[#8e44ad]/40 bg-[#8e44ad]/10 text-[#8e44ad]" : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <PartyPopper className="w-3.5 h-3.5" />
          {t("Holidays")}{on && country ? ` · ${country}` : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3 rounded-[15px]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("Show holidays")}</div>
            <div className="text-[11px] text-muted-foreground">{t("Only a reminder. You can still schedule on these days.")}</div>
          </div>
          <Toggle checked={on} onChange={(v) => change({ on: v })} label={t("Show holidays")} />
        </div>
        {on && (
          <>
            <div className="text-[11px] text-muted-foreground">
              {country
                ? <>{t("Calendar")}: <span className="font-semibold text-foreground">{holidayCountryLabel(country)}</span>{loading ? ` · ${t("Loading…")}` : ""}. {t("Change it in Preferences → Region Settings.")}</>
                : t("No holiday calendar is set. Choose one in Preferences → Region Settings.")}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{t("Regional festivals")}</div>
                <div className="text-[11px] text-muted-foreground">{t("Also show smaller festivals and observances.")}</div>
              </div>
              <Toggle checked={regional} onChange={(v) => change({ regional: v })} label={t("Regional festivals")} />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
