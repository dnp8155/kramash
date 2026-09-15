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

// General-purpose date list formatter — takes an array of "YYYY-MM-DD" strings
// and returns smart-grouped output with automatic month/year grouping:
//   ["2026-09-01"]                                    → "1 Sep 2026"
//   ["2026-09-01", "2026-09-02"]                       → "1, 2 Sep 2026"
//   ["2026-09-01", "2026-09-02", "2026-10-31"]         → "1, 2 Sep, 31 Oct 2026"
//   ["2026-09-01", "2027-10-31"]                       → "1 Sep 2026, 31 Oct 2027"
// Used by both event/project date displays and notification date formatting.
export function formatDatesList(datesArray) {
  if (!Array.isArray(datesArray) || datesArray.length === 0) return "—";
  const parsed = datesArray.map(parseISODate).filter(Boolean).sort((a, b) => a - b);
  if (parsed.length === 0) return "—";
  const first = parsed[0];
  const sameYear = parsed.every((d) => d.getFullYear() === first.getFullYear());
  // Group consecutive dates by (year, month)
  const groups = [];
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
    return formatDatesList(dates);
  }
  return formatEventDate(event?.start_date, event?.end_date);
}

// Format the exact dates a team member was assigned to an event.
// Prefers the assignment's working_dates array (non-consecutive selected dates),
// then falls back to the per-member booking_start_date / booking_end_date range,
// then to the event's own date range. Never assumes every event date applies.
export function formatAssignedDates(assignment, event) {
  const wd = Array.isArray(assignment?.working_dates)
    ? assignment.working_dates.filter(Boolean)
    : [];
  if (wd.length > 0) {
    return formatDatesList(wd);
  }
  const start = assignment?.booking_start_date || event?.start_date;
  const end = assignment?.booking_end_date || event?.end_date || start;
  return formatEventDate(start, end);
}

// Whether a team assignment covers a specific date.
// Prefers working_dates (non-consecutive selected dates), then the per-member
// booking_start_date / booking_end_date range, then the event's own dates.
export function isAssignedToDate(assignment, date, event) {
  if (!assignment || !date) return false;
  const wd = Array.isArray(assignment.working_dates) ? assignment.working_dates.filter(Boolean) : [];
  if (wd.length > 0) return wd.includes(date);
  const bs = assignment.booking_start_date;
  const be = assignment.booking_end_date;
  if (bs && be) return date >= bs && date <= be;
  if (bs) return date === bs;
  const ed = Array.isArray(event?.event_dates) ? event.event_dates : (event?.start_date ? [event.start_date] : []);
  return ed.includes(date);
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