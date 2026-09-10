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

// Two date ranges overlap when A.start <= B.end AND A.end >= B.start.
export function rangesOverlap(a, b) {
  const aR = eventRange(a);
  const bR = eventRange(b);
  if (!aR || !bR) return false;
  return aR.start <= bR.end && aR.end >= bR.start;
}

// Resolve the actual dates a member works on an assignment.
// If working_dates is populated, use those specific dates.
// Otherwise, fall back to the full event date range.
export function assignmentDates(assignment, event) {
  if (!assignment) return [];
  if (assignment.working_dates && assignment.working_dates.length > 0) {
    return assignment.working_dates;
  }
  if (!event) return [];
  const r = eventRange(event);
  if (!r) return [];
  // Expand event range to individual dates
  const dates = [];
  let d = r.start;
  while (d <= r.end) {
    dates.push(d);
    // Increment by 1 day (string comparison works for YYYY-MM-DD)
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return dates;
}

// Resolve the dates being checked for a new assignment.
// Uses working_dates if provided, otherwise the event's date range.
export function checkDates(workingDates, event) {
  if (workingDates && workingDates.length > 0) {
    return workingDates;
  }
  if (!event) return [];
  const r = eventRange(event);
  if (!r) return [];
  const dates = [];
  let d = r.start;
  while (d <= r.end) {
    dates.push(d);
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return dates;
}

// Check if two date sets share any common date (per-date conflict detection).
// This is the working-date-aware version: a conflict exists only if both
// assignments actually work on the same calendar date.
export function datesIntersect(datesA, datesB) {
  if (!datesA.length || !datesB.length) return false;
  const setB = new Set(datesB);
  return datesA.some((d) => setB.has(d));
}

// Returns the conflicting assignments (with their events) for a member being
// assigned to `event` — i.e. other Assigned events whose actual working dates
// overlap the dates being checked.
//
// Working-date-aware: if an existing assignment has working_dates, only those
// specific dates are checked. Otherwise, the full event range is used.
export function getMemberConflicts(memberId, event, assignments, eventMap, workingDates = null) {
  const newDates = checkDates(workingDates, event);
  if (newDates.length === 0) return [];

  return assignments
    .filter(
      (a) => a.team_member_id === memberId && a.assignment_status === "Assigned"
    )
    .map((a) => {
      const ev = eventMap[a.event_id];
      const existingDates = assignmentDates(a, ev);
      return { assignment: a, event: ev, existingDates };
    })
    .filter(({ event: ev, existingDates }) => {
      if (!ev || ev.id === event.id) return false;
      return datesIntersect(newDates, existingDates);
    });
}

// Check if a member is blocked on any of the given dates.
// Returns array of conflicting block dates (active only).
export function getBlockDateConflicts(memberId, dates, blockDates) {
  if (!dates.length) return [];
  const dateSet = new Set(dates);
  return blockDates.filter((b) => {
    if (b.team_member_id !== memberId || b.status !== "active") return false;
    // Check if the block range overlaps any of the dates
    const blockStart = b.start_date;
    const blockEnd = b.end_date || b.start_date;
    return dates.some((d) => d >= blockStart && d <= blockEnd);
  });
}

// Is a member booked on a given date (YYYY-MM-DD)?
// Working-date-aware: checks actual working dates when available.
export function isBookedOnDate(memberId, dateStr, assignments, eventMap) {
  return assignments.some((a) => {
    if (a.team_member_id !== memberId || a.assignment_status !== "Assigned")
      return false;
    const ev = eventMap[a.event_id];
    if (!ev) return false;
    const dates = assignmentDates(a, ev);
    return dates.includes(dateStr);
  });
}

// Is a member blocked on a given date (YYYY-MM-DD)?
export function isBlockedOnDate(memberId, dateStr, blockDates) {
  return blockDates.some((b) => {
    if (b.team_member_id !== memberId || b.status !== "active") return false;
    const blockEnd = b.end_date || b.start_date;
    return dateStr >= b.start_date && dateStr <= blockEnd;
  });
}

// Compute availability status for a member on a given date.
// Returns: "available" | "booked" | "blocked" | "inactive"
export function getAvailabilityStatus(member, dateStr, assignments, eventMap, blockDates) {
  if (!member || member.status === "Inactive") return "inactive";
  if (isBlockedOnDate(member.id, dateStr, blockDates)) return "blocked";
  if (isBookedOnDate(member.id, dateStr, assignments, eventMap)) return "booked";
  return "available";
}

// Today as YYYY-MM-DD (local).
export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Check if a team member has dependent records that prevent hard deletion.
// Returns { canDelete, reasons } — if canDelete is false, reasons is an array
// of human-readable strings explaining why deletion is blocked.
export function checkMemberDependencies(memberId, assignments, transactions, blockDates) {
  const reasons = [];

  const hasAssignments = assignments.some(
    (a) => a.team_member_id === memberId
  );
  if (hasAssignments) {
    reasons.push("This team member has event assignments.");
  }

  const hasPayments = transactions.some(
    (t) =>
      t.team_member_id === memberId &&
      t.status === "ACTIVE" &&
      t.transaction_type === "TEAM_PAYMENT"
  );
  if (hasPayments) {
    reasons.push("This team member has payment records.");
  }

  const hasBlocks = blockDates.some(
    (b) => b.team_member_id === memberId && b.status === "active"
  );
  if (hasBlocks) {
    reasons.push("This team member has active block dates.");
  }

  return {
    canDelete: reasons.length === 0,
    reasons,
  };
}