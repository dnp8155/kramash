import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, Check } from "lucide-react";
import { useT } from "@/hooks/useT";
import { formatDate } from "@/lib/dates";

// Native date inputs can render blank on phones, so the chosen date is drawn as text and the real input sits invisibly on top to take the tap.
function DateBox({ value, min, onChange, placeholder }) {
  return (
    <div className="relative h-10">
      <div className="absolute inset-0 flex items-center gap-2 px-3 bg-card border border-border rounded-lg text-sm pointer-events-none">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value ? formatDate(value) : placeholder}</span>
      </div>
      <input type="date" value={value} min={min} onChange={onChange} aria-label={placeholder} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
    </div>
  );
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtShort(s) {
  try {
    const dt = parseDateStr(s);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return s;
  }
}

function buildRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = parseDateStr(startDate);
  const end = parseDateStr(endDate);
  if (!start || !end || end < start) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function buildRenderList(rangeDates, selectedSet, expanded, canCollapse) {
  const items = [];
  let i = 0;
  // Gaps only collapse when the form was opened with days already chosen (editing).
  // While picking days for the first time, every day stays its own chip so the full
  // range remains visible; the "…" chip never appears mid-selection.
  const hasAnySelected = canCollapse && selectedSet.size > 0;
  while (i < rangeDates.length) {
    const d = rangeDates[i];
    const isSelected = selectedSet.has(d);
    if (isSelected) {
      items.push({ type: "day", dates: [d], selected: true });
      i++;
    } else {
      const group = [];
      while (i < rangeDates.length && !selectedSet.has(rangeDates[i])) {
        group.push(rangeDates[i]);
        i++;
      }
      if (hasAnySelected && group.length >= 2 && !expanded) {
        items.push({ type: "gap", dates: group, selected: false });
      } else {
        group.forEach((gd) => items.push({ type: "day", dates: [gd], selected: false }));
      }
    }
  }
  return items;
}

export default function DateRangeChips({
  startDate = "",
  endDate = "",
  value = [],
  onChange,
  onStartChange,
  onEndChange,
  dayLabel = "day",
  followStart = false,
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  // Stretches of unused days collapse into "…" only for days that were already saved. Once the user
  // starts picking from an empty list (or changes the range) every day stays visible.
  const [picking, setPicking] = useState(false);
  const canCollapse = !picking;
  // New entries only: the end date follows the start date until the user sets it themselves.
  // Never for existing ones — editing a start date must not move their end date.
  const endTouched = useRef(false);

  const rangeDates = useMemo(() => buildRange(startDate, endDate), [startDate, endDate]);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const renderItems = useMemo(
    () => buildRenderList(rangeDates, selectedSet, expanded, canCollapse),
    [rangeDates, selectedSet, expanded, canCollapse]
  );

  const hasRange = rangeDates.length > 0;

  const toggleDate = (d) => {
    if (selectedSet.size === 0) setPicking(true);
    const next = new Set(selectedSet);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange(Array.from(next).sort());
  };

  const handleStartChange = (v) => {
    onStartChange?.(v);
    setPicking(true); // new range: show every day again
    if (!v) return;
    const endBeforeStart = endDate && parseDateStr(endDate) < parseDateStr(v);
    if (followStart && (!endTouched.current || !endDate || endBeforeStart)) {
      onEndChange?.(v);
      if (endBeforeStart) endTouched.current = false;
    } else if (endBeforeStart) {
      onEndChange?.("");
    }
  };

  const gapCount = renderItems.filter((it) => it.type === "gap").length;
  const totalGapDays = renderItems
    .filter((it) => it.type === "gap")
    .reduce((acc, it) => acc + it.dates.length, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("Start Date")}</label>
          <DateBox value={startDate} onChange={(e) => handleStartChange(e.target.value)} placeholder={t("Start Date")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("End Date")}</label>
          <DateBox value={endDate} min={startDate || undefined} onChange={(e) => { endTouched.current = true; setPicking(true); onEndChange?.(e.target.value); }} placeholder={t("End Date")} />
        </div>
      </div>

      {hasRange ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {renderItems.map((item, idx) => {
              if (item.type === "gap") {
                return (
                  <button
                    key={`gap-${idx}`}
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-dashed border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/70 transition-colors"
                    title={`${item.dates.length} ${t("excluded days — tap to expand")}`}
                  >
                    (…{item.dates.length})
                  </button>
                );
              }
              const d = item.dates[0];
              const selected = item.selected;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDate(d)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                    selected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {fmtShort(d)}
                </button>
              );
            })}
          </div>

          {expanded && totalGapDays > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-primary font-medium hover:underline"
            >
              {t("Collapse excluded days")}
            </button>
          )}

          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {t("Tap a day to include/exclude it — not every day in the range has to be a {day}.").replace("{day}", dayLabel)}
            {gapCount > 0 && !expanded && ` ${t("Stretches of unused days collapse into a '…' chip; tap it to expand.")}`}
          </p>

          <p className="text-xs font-medium text-foreground">
            {selectedSet.size} {dayLabel}{selectedSet.size !== 1 ? "s" : ""} {t("selected")}
            {rangeDates.length > 0 && ` · ${rangeDates.length} ${t("total in range")}`}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {t("Pick a start and end date to generate the day list.")}
        </p>
      )}
    </div>
  );
}