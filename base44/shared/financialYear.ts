// Shared Financial Year utilities for backend functions.
// Indian FY convention: April 1 → March 31.
// Display format: FY 2026–27 (en-dash, not hyphen).

// Returns { name, start_date, end_date } for the FY that contains the given date.
// e.g. "2026-09-09" → FY 2026–27 (2026-04-01 → 2027-03-31).
export function getFinancialYearForDate(dateStr: string): { name: string; start_date: string; end_date: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    name: `FY ${startYear}\u2013${String(endYear).slice(-2)}`,
    start_date: `${startYear}-04-01`,
    end_date: `${endYear}-03-31`,
  };
}

// Returns the current FY based on today's date.
export function getCurrentFinancialYear(): { name: string; start_date: string; end_date: string } {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const today = `${d.getFullYear()}-${m}-${day}`;
  return getFinancialYearForDate(today) || (() => {
    const year = d.getFullYear();
    const startYear = d.getMonth() + 1 >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return {
      name: `FY ${startYear}\u2013${String(endYear).slice(-2)}`,
      start_date: `${startYear}-04-01`,
      end_date: `${endYear}-03-31`,
    };
  })();
}

// Finds the FinancialYear record that contains the given date.
export function findFYForDate(dateStr: string, fys: any[]): any | null {
  if (!dateStr || !fys || !fys.length) return null;
  return fys.find(
    (fy) => dateStr >= fy.start_date && dateStr <= fy.end_date
  ) || null;
}

// Validates that a new FY doesn't overlap with existing FYs.
export function checkFYOverlap(
  startDate: string,
  endDate: string,
  existingFYs: any[],
  excludeId?: string
): boolean {
  return existingFYs.some(
    (fy) =>
      (!excludeId || fy.id !== excludeId) &&
      startDate <= fy.end_date &&
      endDate >= fy.start_date
  );
}