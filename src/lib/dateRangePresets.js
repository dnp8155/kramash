import { fyDisplayLabel } from "@/lib/financialYearService";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toISO(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function monthRange(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  return {
    startDate: toISO(year, month, 1),
    endDate: toISO(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()),
  };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function deriveQuarters(fy) {
  const start = new Date(fy.start_date + "T00:00:00");
  const quarters = [];
  for (let q = 0; q < 4; q++) {
    const qStart = new Date(start.getFullYear(), start.getMonth() + q * 3, 1);
    const qEnd = new Date(start.getFullYear(), start.getMonth() + q * 3 + 3, 0);
    quarters.push({
      type: "quarter",
      label: `Q${q + 1} – ${MONTH_SHORT[qStart.getMonth()]}–${MONTH_SHORT[qEnd.getMonth()]} ${qEnd.getFullYear()}`,
      startDate: toISO(qStart.getFullYear(), qStart.getMonth(), 1),
      endDate: toISO(qEnd.getFullYear(), qEnd.getMonth(), qEnd.getDate()),
    });
  }
  return quarters;
}

export function buildDateRangePresets(fiscalYears, activeFY) {
  const presets = [];
  if (!fiscalYears?.length) return presets;

  const sortedFYs = [...fiscalYears].sort((a, b) => b.start_date.localeCompare(a.start_date));

  for (const fy of sortedFYs) {
    presets.push({
      type: "fy",
      label: fyDisplayLabel(fy),
      startDate: fy.start_date,
      endDate: fy.end_date,
      fyId: fy.id,
    });
  }

  if (activeFY) {
    presets.push(...deriveQuarters(activeFY));
  }

  const now = new Date();
  const calYear = now.getFullYear();
  presets.push({
    type: "calendar_year",
    label: `Calendar Year ${calYear}`,
    startDate: `${calYear}-01-01`,
    endDate: `${calYear}-12-31`,
  });

  presets.push({ type: "this_month", label: "This Month", ...monthRange(now.getFullYear(), now.getMonth()) });

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  presets.push({ type: "last_month", label: "Last Month", ...monthRange(lastMonth.getFullYear(), lastMonth.getMonth()) });

  presets.push({ type: "all_time", label: "All Time", startDate: null, endDate: null });

  return presets;
}