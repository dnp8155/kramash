import Input from "@/components/common/Input";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { datesInRange, formatDateFull } from "@/lib/quotationCalc";

const fmtShort = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
import { cn } from "@/lib/utils";
import { Calendar, Check, Layers, List } from "lucide-react";
import { useState } from "react";
import { useT } from "@/hooks/useT";

export default function QuotationDateEngine({
  startDate, setStartDate,
  endDate, setEndDate,
  excludedDates, setExcludedDates,
  mode, setMode,
  readOnly
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const allDates = datesInRange(startDate, endDate);
  const excludedSet = new Set(excludedDates || []);

  const toggleExclude = (date) => {
    if (readOnly) return;
    if (excludedSet.has(date)) {
      setExcludedDates(excludedDates.filter((d) => d !== date));
    } else {
      setExcludedDates([...excludedDates, date]);
    }
  };

  const includedCount = allDates.filter((d) => !excludedSet.has(d)).length;

  // Same as the event form: runs of 2+ unused days between used ones fold into one "(…N)" chip.
  const renderItems = [];
  for (let i = 0; i < allDates.length;) {
    if (!excludedSet.has(allDates[i]) || !includedCount) { renderItems.push({ type: "day", dates: [allDates[i]] }); i++; continue; }
    const group = [];
    while (i < allDates.length && excludedSet.has(allDates[i])) { group.push(allDates[i]); i++; }
    if (group.length >= 2 && !expanded) renderItems.push({ type: "gap", dates: group });
    else group.forEach((d) => renderItems.push({ type: "day", dates: [d] }));
  }
  const gapCount = renderItems.filter((it) => it.type === "gap").length;

  return (
    <Section icon={Calendar} title={t("Project Dates")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t("Start Date")}>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label={t("End Date")}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={readOnly} />
        </Field>
      </div>

      {allDates.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {renderItems.map((item, idx) => {
              if (item.type === "gap") {
                return (
                  <button
                    key={`gap-${idx}`} type="button" onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-dashed border-border px-3 py-1.5 text-xs font-medium sm:hover:bg-muted/70 transition-colors"
                    title={`${item.dates.length} ${t("excluded days — tap to expand")}`}
                  >
                    (…{item.dates.length})
                  </button>
                );
              }
              const date = item.dates[0];
              const included = !excludedSet.has(date);
              return (
                <button
                  key={date} type="button" onClick={() => toggleExclude(date)} disabled={readOnly}
                  title={formatDateFull(date)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                    included ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border",
                    !readOnly && !included && "sm:hover:border-primary/40 sm:hover:text-foreground"
                  )}
                >
                  {included && <Check className="w-3 h-3" />}
                  {fmtShort(date)}
                </button>
              );
            })}
          </div>
          {expanded && gapCount > 0 && (
            <button type="button" onClick={() => setExpanded(false)} className="text-xs text-primary font-medium sm:hover:underline">
              {t("Collapse excluded days")}
            </button>
          )}
          {!readOnly && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              {t("Tap a day to include/exclude it.")}
              {gapCount > 0 && !expanded && ` ${t("Stretches of unused days collapse into a '…' chip; tap it to expand.")}`}
            </p>
          )}
          <p className="text-xs font-medium text-foreground">{includedCount} {t("included")} · {allDates.length} {t("total in range")}</p>
          {includedCount === 0 && (
            <p className="text-xs text-warning">{t("All dates are excluded. Include at least one date for the quotation scope.")}</p>
          )}
        </div>
      )}

      {includedCount > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">{t("Quotation Mode")}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => !readOnly && setMode("day_wise")} disabled={readOnly}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                mode === "day_wise" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground sm:hover:bg-muted/40",
                !readOnly && "cursor-pointer"
              )}>
              <Layers className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">{t("Day-wise")}</div>
                <div className="text-[11px] text-muted-foreground">{t("Each date is a separate section with its own items & total")}</div>
              </div>
            </button>
            <button type="button" onClick={() => !readOnly && setMode("regular")} disabled={readOnly}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                mode === "regular" || !mode ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground sm:hover:bg-muted/40",
                !readOnly && "cursor-pointer"
              )}>
              <List className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">{t("Regular (Full)")}</div>
                <div className="text-[11px] text-muted-foreground">{t("All items grouped under \"General\" — no per-date breakdown")}</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}