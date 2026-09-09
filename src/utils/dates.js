// Date helpers that operate on date-only "YYYY-MM-DD" strings to avoid
// timezone-related accidental date shifts. All comparisons are calendar-based.

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function isToday(dateStr) {
  return !!dateStr && dateStr === todayISO();
}

// Week runs Monday → Sunday.
export function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const d = new Date(dateStr + "T00:00:00");
  return d >= monday && d <= sunday;
}

export function isUpcoming(dateStr) {
  return !!dateStr && dateStr >= todayISO();
}

export function isPast(dateStr) {
  return !!dateStr && dateStr < todayISO();
}