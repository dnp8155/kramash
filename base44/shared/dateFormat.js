// Date formatting helpers shared across backend functions.
export function isoDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function fiscalYearLabel(startYear) {
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function currentFiscalYearStart(referenceDate = new Date(), fyStartMonth = 3) {
  // fyStartMonth is 0-indexed (3 = April). Default Indian FY: April–March.
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const start = new Date(year, fyStartMonth, 1);
  if (d < start) {
    start.setFullYear(year - 1);
  }
  return start;
}