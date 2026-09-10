// Date-wise assignment resolution helpers for the Progress page.
// All dates are date-only "YYYY-MM-DD" strings to avoid timezone shifts.

// Returns events that span the given date (start_date <= date <= end_date).
// Excludes cancelled events.
export function getEventsForDate(events, date) {
  return events.filter((e) => {
    if (!e.start_date) return false;
    if (e.status === "Cancelled") return false;
    const start = e.start_date;
    const end = e.end_date || e.start_date;
    return date >= start && date <= end;
  });
}

// Returns team assignments that include the given date in their working_dates.
export function getTeamForDate(assignments, date) {
  return assignments.filter(
    (a) => a.assignment_status === "Assigned" && (a.working_dates || []).includes(date)
  );
}

// Returns service assignments that apply to the given date.
// If working_dates is set and non-empty, only those dates count.
// If working_dates is null/empty, all event dates count (backward compat).
export function getServicesForDate(serviceAssignments, events, date) {
  return serviceAssignments.filter((sa) => {
    if (sa.assignment_status !== "Assigned") return false;
    const dates = sa.working_dates;
    if (dates && dates.length > 0) {
      return dates.includes(date);
    }
    // Fallback: all event dates
    const event = events.find((e) => e.id === sa.event_id);
    if (!event || !event.start_date) return false;
    const start = event.start_date;
    const end = event.end_date || event.start_date;
    return date >= start && date <= end;
  });
}