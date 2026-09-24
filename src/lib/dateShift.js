// Utilities for detecting event date changes and shifting team assignment working dates.

export function getEventDates(event) {
  const dates = event?.event_dates;
  if (Array.isArray(dates) && dates.length > 0) return [...dates].sort();
  if (event?.start_date) return [event.start_date];
  return [];
}

export function datesChanged(oldDates, newDates) {
  const a = [...(oldDates || [])].sort();
  const b = [...(newDates || [])].sort();
  if (a.length !== b.length) return true;
  return a.some((d, i) => d !== b[i]);
}

// Map old working_dates to new dates based on position in the old/new event date arrays.
// If counts differ, fall back to all new dates.
export function shiftWorkingDates(oldWorkingDates, oldEventDates, newEventDates) {
  const sortedNew = [...(newEventDates || [])].sort();
  if (!oldWorkingDates || oldWorkingDates.length === 0) return sortedNew;
  if (!oldEventDates || oldEventDates.length === 0 || sortedNew.length === 0) return sortedNew;

  const sortedOld = [...oldEventDates].sort();
  if (sortedOld.length === sortedNew.length) {
    const oldToNew = {};
    sortedOld.forEach((d, i) => { oldToNew[d] = sortedNew[i]; });
    const shifted = oldWorkingDates.map((d) => oldToNew[d]).filter(Boolean);
    return shifted.length > 0 ? [...new Set(shifted)].sort() : sortedNew;
  }
  return sortedNew;
}

// Fetch all assigned team assignments for an event and shift their working_dates.
// Returns the number of assignments updated.
export async function shiftTeamAssignments(base44, workspaceId, eventId, oldEventDates, newEventDates) {
  const assignments = await base44.entities.EventTeamAssignment.filter({
    workspace_id: workspaceId,
    event_id: eventId,
    assignment_status: "assigned",
  });
  if (!assignments || assignments.length === 0) return 0;

  const updates = assignments.map((a) => {
    const shifted = shiftWorkingDates(a.working_dates, oldEventDates, newEventDates);
    const sorted = [...shifted].sort();
    return {
      id: a.id,
      working_dates: sorted,
      booking_start_date: sorted[0] || a.booking_start_date || null,
      booking_end_date: sorted[sorted.length - 1] || a.booking_end_date || null,
    };
  });

  await base44.entities.EventTeamAssignment.bulkUpdate(updates);
  return updates.length;
}