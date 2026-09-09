// Availability & conflict helpers for the Team module.
// All dates are date-only ISO strings (YYYY-MM-DD); single-day events use the
// same value for start and end, so range comparisons stay consistent.

// Normalized [start, end] range for an event (end defaults to start).
export function eventRange(ev) {
  if (!ev) return null;
  const start = ev.start_date;
  const end = ev.end_date || ev.start_date;
  return { start, end };
}

// Two events overlap when A.start <= B.end AND A.end >= B.start.
export function rangesOverlap(a, b) {
  const aR = eventRange(a);
  const bR = eventRange(b);
  if (!aR || !bR) return false;
  return aR.start <= bR.end && aR.end >= bR.start;
}

// Returns the conflicting assignments (with their events) for a member being
// assigned to `event` — i.e. other Assigned events whose range overlaps.
export function getMemberConflicts(memberId, event, assignments, eventMap) {
  return assignments
    .filter(
      (a) => a.team_member_id === memberId && a.assignment_status === "Assigned"
    )
    .map((a) => ({ assignment: a, event: eventMap[a.event_id] }))
    .filter(({ event: ev }) => ev && ev.id !== event.id && rangesOverlap(ev, event));
}

// Is a member booked on a given date (YYYY-MM-DD)?
export function isBookedOnDate(memberId, dateStr, assignments, eventMap) {
  return assignments.some((a) => {
    if (a.team_member_id !== memberId || a.assignment_status !== "Assigned")
      return false;
    const ev = eventMap[a.event_id];
    if (!ev) return false;
    const r = eventRange(ev);
    return dateStr >= r.start && dateStr <= r.end;
  });
}

// Today as YYYY-MM-DD (local).
export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}