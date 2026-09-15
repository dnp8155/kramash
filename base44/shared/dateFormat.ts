// Centralized date formatting — mirrors src/lib/dates.js formatDatesList.
// Used by backend functions (e.g. generateNotifications) so notification
// message dates match the frontend event/project date format exactly.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parse "YYYY-MM-DD" as a local Date (noon to avoid DST edge cases).
function parseISODate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

// Format an array of "YYYY-MM-DD" dates with smart month/year grouping:
//   ["2026-09-01"]                                    → "1 Sep 2026"
//   ["2026-09-01", "2026-09-02"]                       → "1, 2 Sep 2026"
//   ["2026-09-01", "2026-09-02", "2026-10-31"]         → "1, 2 Sep, 31 Oct 2026"
//   ["2026-09-01", "2027-10-31"]                       → "1 Sep 2026, 31 Oct 2027"
export function formatDatesList(datesArray: string[] | null | undefined): string {
  if (!Array.isArray(datesArray) || datesArray.length === 0) return "—";
  const parsed = datesArray
    .map(parseISODate)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return "—";

  const first = parsed[0];
  const sameYear = parsed.every((d) => d.getFullYear() === first.getFullYear());

  // Group consecutive dates by (year, month)
  const groups: { key: string; year: number; month: number; days: number[] }[] = [];
  for (const d of parsed) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(d.getDate());
    } else {
      groups.push({ key, year: d.getFullYear(), month: d.getMonth(), days: [d.getDate()] });
    }
  }

  const parts = groups.map((g) => {
    const daysStr = g.days.join(", ");
    const monthYear = sameYear ? MONTHS[g.month] : `${MONTHS[g.month]} ${g.year}`;
    return `${daysStr} ${monthYear}`;
  });

  return parts.join(", ") + (sameYear ? ` ${first.getFullYear()}` : "");
}