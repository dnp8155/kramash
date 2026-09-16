import Input from "@/components/common/Input";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { datesInRange, formatDateChip, formatDateFull } from "@/lib/quotationCalc";
import { cn } from "@/lib/utils";
import { Calendar, X, Layers, List } from "lucide-react";

export default function QuotationDateEngine({
  startDate, setStartDate,
  endDate, setEndDate,
  excludedDates, setExcludedDates,
  mode, setMode,
  readOnly
}) {
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

  const includedCount = allDates.length - excludedSet.size;

  return (
    <Section icon={Calendar} title="Project Dates">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="End Date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={readOnly} />
        </Field>
      </div>

      {allDates.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Date Chips ({includedCount} included, {excludedSet.size} excluded)
            </span>
            {!readOnly && (
              <span className="text-[11px] text-muted-foreground">Click a chip to include/exclude</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allDates.map((date) => {
              const isExcluded = excludedSet.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleExclude(date)}
                  disabled={readOnly}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    isExcluded
                      ? "bg-muted text-muted-foreground/50 border-border line-through"
                      : "bg-primary text-primary-foreground border-primary",
                    !readOnly && "cursor-pointer hover:opacity-80"
                  )}
                  title={formatDateFull(date)}
                >
                  {formatDateChip(date)}
                  {isExcluded && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
          {includedCount === 0 && (
            <p className="text-xs text-warning mt-2">All dates are excluded. Include at least one date for the quotation scope.</p>
          )}
        </div>
      )}

      {/* Quotation Mode — Day-wise vs Regular */}
      {includedCount > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">Quotation Mode</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !readOnly && setMode("day_wise")}
              disabled={readOnly}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                mode === "day_wise"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
                !readOnly && "cursor-pointer"
              )}
            >
              <Layers className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">Day-wise</div>
                <div className="text-[11px] text-muted-foreground">Each date is a separate section with its own items & total</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => !readOnly && setMode("regular")}
              disabled={readOnly}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                mode === "regular" || !mode
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
                !readOnly && "cursor-pointer"
              )}
            >
              <List className="w-4 h-4" />
              <div className="text-left">
                <div className="text-sm font-medium">Regular (Full)</div>
                <div className="text-[11px] text-muted-foreground">All items grouped under "General" — no per-date breakdown</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}