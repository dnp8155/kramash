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

// Derive availability status for a member on a given ISO date.
// Returns "available" | "booked" | "inactive".
export function availabilityForDate(member, dateISO, assignments, eventsById) {
  if (member.status === "inactive") return "inactive";
  for (const a of assignments) {
    if (a.team_member_id !== member.id) continue;
    if (a.assignment_status === "removed") continue;
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    const end = ev.end_date || ev.start_date;
    if (dateISO >= ev.start_date && dateISO <= end) return "booked";
  }
  return "available";
}

// Split members into available / booked lists for a date.
export function splitAvailability(members, dateISO, assignments, eventsById) {
  const available = [];
  const booked = [];
  for (const m of members) {
    const st = availabilityForDate(m, dateISO, assignments, eventsById);
    if (st === "inactive") continue;
    if (st === "booked") {
      const ev = assignments
        .filter((a) => a.team_member_id === m.id && a.assignment_status !== "removed")
        .map((a) => eventsById[a.event_id])
        .find((e) => e && e.status !== "cancelled" && dateISO >= e.start_date && dateISO <= (e.end_date || e.start_date));
      booked.push({ member: m, event: ev });
    } else {
      available.push(m);
    }
  }
  return { available, booked };
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