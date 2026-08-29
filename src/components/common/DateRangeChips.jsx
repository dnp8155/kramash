import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, MoreHorizontal } from "lucide-react";

// Range-based date picker:
// - start/end define the full range
// - every day in the range becomes a chip
// - tap a chip to include/exclude it as a "shoot day" (event_dates)
// - stretches of excluded days (>2 consecutive) collapse into a "..." chip
//
// Props:
//   startDate: "YYYY-MM-DD" | ""
//   endDate:   "YYYY-MM-DD" | ""
//   value:      ["YYYY-MM-DD", ...]  (selected shoot days)
//   onChange:   (nextSelectedDates) => void
//   onStartChange / onEndChange: (dateStr) => void

function toDateStr(d) {
  // d is a Date at local midnight
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

function daysBetween(start, end) {
  const a = parseDateStr(start);
  const b = parseDateStr(end);
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000) + 1;
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

// Build a render list: selected chips shown individually, consecutive excluded
// chips (>2) collapsed into a single "..." token.
function buildRenderList(rangeDates, selectedSet, expanded) {
  const items = []; // { type: "day"|"gap", dates: [...], selected: bool }
  let i = 0;
  while (i < rangeDates.length) {
    const d = rangeDates[i];
    const isSelected = selectedSet.has(d);
    if (isSelected) {
      items.push({ type: "day", dates: [d], selected: true });
      i++;
    } else {
      // collect consecutive excluded dates
      const group = [];
      while (i < rangeDates.length && !selectedSet.has(rangeDates[i])) {
        group.push(rangeDates[i]);
        i++;
      }
      if (group.length > 2 && !expanded) {
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
}) {
  const [expanded, setExpanded] = useState(false);

  const rangeDates = useMemo(() => buildRange(startDate, endDate), [startDate, endDate]);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const renderItems = useMemo(
    () => buildRenderList(rangeDates, selectedSet, expanded),
    [rangeDates, selectedSet, expanded]
  );

  const hasRange = rangeDates.length > 0;

  const toggleDate = (d) => {
    const next = new Set(selectedSet);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    // return sorted array
    onChange(Array.from(next).sort());
  };

  const handleStartChange = (v) => {
    onStartChange?.(v);
    // if end before start, clear end
    if (endDate && v && parseDateStr(endDate) < parseDateStr(v)) {
      onEndChange?.("");
    }
  };

  const gapCount = renderItems.filter((it) => it.type === "gap").length;
  const totalGapDays = renderItems
    .filter((it) => it.type === "gap")
    .reduce((acc, it) => acc + it.dates.length, 0);

  return (
    <div className="space-y-3">
      {/* Range inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full h-10 pl-10 pr-3 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onEndChange?.(e.target.value)}
              className="w-full h-10 pl-10 pr-3 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      </div>

      {/* Chips */}
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
                    title={`${item.dates.length} excluded days — tap to expand`}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    {item.dates.length} days
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

          {/* Collapse control when expanded */}
          {expanded && totalGapDays > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-primary font-medium hover:underline"
            >
              Collapse excluded days
            </button>
          )}

          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Tap a day to include/exclude it — not every day in the range has to be a shoot day.
            {gapCount > 0 && !expanded && " Stretches of unused days collapse into a '…' chip; tap it to expand."}
          </p>

          <p className="text-xs font-medium text-foreground">
            {selectedSet.size} shoot day{selectedSet.size !== 1 ? "s" : ""} selected
            {rangeDates.length > 0 && ` · ${rangeDates.length} total in range`}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Pick a start and end date to generate the day list.
        </p>
      )}
    </div>
  );
}