// Date helpers — all parsing uses LOCAL time to avoid timezone date shifts.
// Dates are stored as "YYYY-MM-DD" strings.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "YYYY-MM-DD" as a local Date (noon to avoid DST edge cases).
export function parseISODate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO() {
  return toISODate(new Date());
}

// Format a single date: "26 Aug 2026"
function formatSingle(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Format an event date range, matching the Kramasha style:
// "26 Aug 2026" | "23, 25 Apr 2026" | "31 Jan, 1 Feb 2026" | "31 Dec 2026, 1 Jan 2027"
export function formatEventDate(startStr, endStr) {
  const start = parseISODate(startStr);
  if (!start) return "—";
  if (!endStr || endStr === startStr) return formatSingle(start);
  const end = parseISODate(endStr);
  if (!end) return formatSingle(start);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}, ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]}, ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${formatSingle(start)}, ${formatSingle(end)}`;
}

// Format an event's dates — prefers non-consecutive event_dates array,
// falls back to start_date / end_date range for legacy events.
export function formatEventDates(event) {
  const dates = event?.event_dates;
  if (Array.isArray(dates) && dates.length > 0) {
    if (dates.length === 1) {
      return formatSingle(parseISODate(dates[0]));
    }
    const parsed = dates.map(parseISODate).filter(Boolean).sort((a, b) => a - b);
    if (parsed.length === 0) return "—";
    const first = parsed[0];
    const last = parsed[parsed.length - 1];
    // Same month → "23, 25, 28 Apr 2026"
    if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
      const days = parsed.map((d) => d.getDate()).join(", ");
      return `${days} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
    }
    // Spread across months → "28 Aug, 02 Sep, 10 Oct 2026"
    const sameYear = parsed.every((d) => d.getFullYear() === first.getFullYear());
    return parsed
      .map((d) => `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`)
      .join(", ") + (sameYear ? ` ${first.getFullYear()}` : "");
  }
  return formatEventDate(event?.start_date, event?.end_date);
}

export function isToday(dateStr) {
  return dateStr === todayISO();
}

// Monday-Sunday week boundary.
export function isThisWeek(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return false;
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 12);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return d >= monday && d <= sunday;
}

export function isUpcomingDate(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return false;
  return toISODate(d) >= todayISO();
}

export function isPastDate(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return false;
  return toISODate(d) < todayISO();
}

// India financial year: 1 April – 31 March.
// FY "2026-27" covers 2026-04-01 to 2027-03-31.
export function fyRange(fyLabel) {
  if (!fyLabel || fyLabel === "all") return null;
  const startYear = Number(String(fyLabel).slice(0, 4));
  if (!startYear) return null;
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`
  };
}

export function fyForDate(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return null;
  const y = d.getFullYear();
  const fyStart = d.getMonth() >= 3 ? y : y - 1; // April (month 3) starts FY
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

export function currentFY() {
  return fyForDate(todayISO());
}

export function isWithinFY(dateStr, fyLabel) {
  const range = fyRange(fyLabel);
  if (!range) return true;
  return dateStr >= range.start && dateStr <= range.end;
}