// Shared quotation helper functions used by multiple backend functions.
// Extracted to avoid duplication between getPortalData, syncQuotationAcceptance, etc.

export function round2(n: number): number {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// Filter quotation items by type
export function filterTeamItems(items: any[]): any[] {
  return (items || []).filter((it) => it.item_type === "team");
}

export function filterServiceItems(items: any[]): any[] {
  return (items || []).filter((it) => it.item_type === "service");
}

// Calculate a milestone's due amount from its definition and the grand total
export function calculateMilestoneAmount(milestone: any, grandTotal: number): number {
  const value = Math.max(0, Number(milestone?.value) || 0);
  if (milestone?.type === "fixed") return round2(value);
  return round2((Number(grandTotal) || 0) * value / 100);
}

// Group an array by a key
export function groupBy(arr: any[], key: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const item of arr || []) {
    const k = item[key];
    if (!k) continue;
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

// Sum line_total field across items
export function sumLineTotals(items: any[]): number {
  return round2((items || []).reduce((s, it) => s + (Number(it.line_total) || 0), 0));
}

// Return unique sorted date strings
export function uniqueSortedDates(dates: string[]): string[] {
  return [...new Set(dates)].filter(Boolean).sort();
}

// Derive event dates from a quotation (start → end, minus excluded)
export function deriveEventDates(quotation: any): string[] {
  if (!quotation.start_date) return [];
  const excluded = new Set(quotation.excluded_dates || []);
  const start = new Date(quotation.start_date + "T00:00:00");
  const end = quotation.end_date
    ? new Date(quotation.end_date + "T00:00:00")
    : new Date(quotation.start_date + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [quotation.start_date].filter(Boolean);
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    if (!excluded.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}