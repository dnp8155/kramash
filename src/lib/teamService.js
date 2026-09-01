// Reusable team/availability query & service logic for Phase 4.
// All functions are workspace-scoped and operate on already-loaded data
// to avoid unnecessary repeated API calls.

import { base44 } from "@/api/base44Client";
import { DEFAULT_TEAM_ROLES } from "@/constants/teamConfig";

// Load all team members for a workspace (sorted by name).
export async function loadTeamMembers(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500);
  return list || [];
}

// Load all team roles for a workspace (sorted by name).
export async function loadRoles(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200);
  return list || [];
}

// Load active team roles only (for assignment dropdowns).
export async function loadActiveRoles(workspaceId) {
  const roles = await loadRoles(workspaceId);
  return roles.filter((r) => r.status === "active");
}

// Load assignments for a workspace, optionally filtered by event.
export async function loadAssignments(workspaceId, eventId = null) {
  if (!workspaceId) return [];
  const query = eventId
    ? { workspace_id: workspaceId, event_id: eventId }
    : { workspace_id: workspaceId };
  const list = await base44.entities.EventTeamAssignment.filter(query, "-created_date", 1000);
  return list || [];
}

// Load assignments for a specific team member.
export async function loadAssignmentsForMember(workspaceId, memberId) {
  if (!workspaceId || !memberId) return [];
  const list = await base44.entities.EventTeamAssignment.filter(
    { workspace_id: workspaceId, team_member_id: memberId },
    "-created_date",
    1000
  );
  return list || [];
}

// Seed default roles for a workspace if it has none yet.
export async function ensureDefaultRoles(workspaceId) {
  if (!workspaceId) return 0;
  const existing = await loadRoles(workspaceId);
  if (existing.length > 0) return 0;
  const created = await base44.entities.TeamRole.bulkCreate(
    DEFAULT_TEAM_ROLES.map((r) => ({ ...r, workspace_id: workspaceId, status: "active" }))
  );
  return Array.isArray(created) ? created.length : 0;
}

// Load block dates / leave entries for a workspace.
export async function loadBlockDates(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.TeamBlockDate.filter({ workspace_id: workspaceId }, "-start_date", 500);
  return list || [];
}

// Check if a member is blocked on a given ISO date.
export function isBlockedOnDate(memberId, dateISO, blockDates) {
  return (blockDates || []).some((b) => {
    if (b.team_member_id !== memberId) return false;
    if (b.status === "cancelled") return false;
    const end = b.end_date || b.start_date;
    return dateISO >= b.start_date && dateISO <= end;
  });
}

// ---- Date-range overlap & conflict detection ----

// Two date ranges (inclusive, "YYYY-MM-DD") overlap when:
//   aStart <= bEnd AND aEnd >= bStart
// ISO date strings compare correctly lexicographically.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const ae = aEnd || aStart;
  const be = bEnd || bStart;
  return aStart <= be && ae >= bStart;
}

// Find events that conflict with a team member for the given date range.
// `assignments` = all assignments for the workspace (status "assigned").
// `eventsById` = map of event id -> event record.
// `excludeEventId` = the event we are currently assigning to (skip it).
export function findConflicts(memberId, startDate, endDate, assignments, eventsById, excludeEventId = null) {
  if (!memberId || !startDate) return [];
  const conflicts = [];
  for (const a of assignments) {
    if (a.team_member_id !== memberId) continue;
    if (a.assignment_status === "removed") continue;
    if (excludeEventId && a.event_id === excludeEventId) continue;
    const ev = eventsById[a.event_id];
    if (!ev) continue;
    if (ev.status === "cancelled") continue;
    if (rangesOverlap(startDate, endDate || startDate, ev.start_date, ev.end_date)) {
      conflicts.push(ev);
    }
  }
  return conflicts;
}

// ---- Availability ----

// Check if a date falls within an assignment's booking window.
// Priority: per-member booking range → event_dates (non-consecutive) → event start/end.
export function isBookedOnDate(a, ev, dateISO) {
  if (!ev || ev.status === "cancelled") return false;
  // Per-member booking range takes priority
  if (a.booking_start_date) {
    const bEnd = a.booking_end_date || a.booking_start_date;
    return dateISO >= a.booking_start_date && dateISO <= bEnd;
  }
  // Non-consecutive event dates
  if (Array.isArray(ev.event_dates) && ev.event_dates.length > 0) {
    return ev.event_dates.includes(dateISO);
  }
  // Fallback to event start/end
  const end = ev.end_date || ev.start_date;
  return dateISO >= ev.start_date && dateISO <= end;
}

// Derive availability status for a member on a given ISO date.
// Returns "available" | "booked" | "blocked" | "inactive".
export function availabilityForDate(member, dateISO, assignments, eventsById, blockDates = []) {
  if (member.status === "inactive") return "inactive";
  for (const b of blockDates) {
    if (b.team_member_id !== member.id) continue;
    if (b.status === "cancelled") continue;
    const end = b.end_date || b.start_date;
    if (dateISO >= b.start_date && dateISO <= end) return "blocked";
  }
  for (const a of assignments) {
    if (a.team_member_id !== member.id) continue;
    if (a.assignment_status === "removed") continue;
    const ev = eventsById[a.event_id];
    if (isBookedOnDate(a, ev, dateISO)) return "booked";
  }
  return "available";
}

// Split members into available / booked / blocked lists for a date.
export function splitAvailability(members, dateISO, assignments, eventsById, blockDates = []) {
  const available = [];
  const booked = [];
  const blocked = [];
  for (const m of members) {
    const st = availabilityForDate(m, dateISO, assignments, eventsById, blockDates);
    if (st === "inactive") continue;
    if (st === "booked") {
      const match = assignments
        .filter((a) => a.team_member_id === m.id && a.assignment_status !== "removed")
        .find((a) => isBookedOnDate(a, eventsById[a.event_id], dateISO));
      const ev = match ? eventsById[match.event_id] : null;
      booked.push({ member: m, event: ev });
    } else if (st === "blocked") {
      const blk = (blockDates || []).find((b) => b.team_member_id === m.id && b.status !== "cancelled" && dateISO >= b.start_date && dateISO <= (b.end_date || b.start_date));
      blocked.push({ member: m, block: blk });
    } else {
      available.push(m);
    }
  }
  return { available, booked, blocked };
}

// ---- Cost ----

// Sum of agreed rates for active assignments on an event.
export function eventTeamCost(assignments) {
  return (assignments || [])
    .filter((a) => a.assignment_status !== "removed")
    .reduce((sum, a) => sum + (Number(a.agreed_rate) || 0), 0);
}

// Count active bookings for a member.
export function memberBookingCount(memberId, assignments) {
  return (assignments || []).filter(
    (a) => a.team_member_id === memberId && a.assignment_status !== "removed"
  ).length;
}