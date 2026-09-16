// Shared builder for the Team Member Portal data payload.
// Used by both getTeamPortalData (invited-user path) and
// getTeamPortalDataByAccess (password-only portal path) so the two
// paths always return the same shape without duplicating logic.

import { round2 } from "./quotationHelpers.ts";

export async function buildTeamPortalData(base44, teamMemberId, workspaceId, options = {}) {
  const emailOverride = options.emailOverride || null;
  const nameFallback = options.memberNameFallback || "";

  let workspace = null;
  try {
    workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId);
  } catch (e) { /* continue without workspace info */ }

  const currency = workspace?.currency || "INR";

  let memberRecord = null;
  try {
    memberRecord = await base44.asServiceRole.entities.TeamMember.get(teamMemberId);
  } catch (e) { /* continue */ }

  // Team assignments for this member
  const teamAssignments = await base44.asServiceRole.entities.EventTeamAssignment.filter(
    { workspace_id: workspaceId, team_member_id: teamMemberId },
    "-created_date", 1000
  );

  // Service assignments where this member is the provider
  let serviceAssignments = [];
  try {
    serviceAssignments = await base44.asServiceRole.entities.EventServiceAssignment.filter(
      { workspace_id: workspaceId, provider_id: teamMemberId },
      "-created_date", 500
    );
  } catch (e) { serviceAssignments = []; }

  // Team payment transactions for this member
  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, team_member_id: teamMemberId, transaction_type: "TEAM_PAYMENT", status: "ACTIVE" },
    "-transaction_date", 500
  );

  // Load all related events
  const eventIds = [...new Set([
    ...((teamAssignments || []).map((a) => a.event_id)),
    ...((serviceAssignments || []).map((a) => a.event_id))
  ])];
  const events = [];
  await Promise.all(
    eventIds.map(async (eid) => {
      try {
        const ev = await base44.asServiceRole.entities.Event.get(eid);
        if (ev && ev.workspace_id === workspaceId) events.push(ev);
      } catch (e) { /* skip */ }
    })
  );
  const eventsById = {};
  events.forEach((e) => { eventsById[e.id] = e; });

  // Active team assignments
  const activeTeamAsgns = (teamAssignments || []).filter((a) => a.assignment_status !== "removed");
  const activeSvcAsgns = (serviceAssignments || []).filter((a) => a.assignment_status !== "removed");

  // Total earnings = sum of agreed rates from team assignments + service assignments
  const teamEarnings = activeTeamAsgns.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const serviceEarnings = activeSvcAsgns.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalEarnings = round2(teamEarnings + serviceEarnings);

  const totalPaid = (transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, round2(totalEarnings - totalPaid));

  // Build schedule items (upcoming + past) from both assignment types
  const now = new Date().toISOString().split("T")[0];
  const scheduleItems = [];

  for (const a of activeTeamAsgns) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    const bkStart = a.booking_start_date || ev.start_date;
    const bkEnd = a.booking_end_date || ev.end_date || bkStart;
    scheduleItems.push({
      id: a.id,
      type: "team",
      event_id: ev.id,
      event_title: ev.title || "",
      event_type: ev.event_type || "",
      start_date: bkStart || "",
      end_date: bkEnd || "",
      venue: ev.venue || "",
      event_status: ev.status || "upcoming",
      role_name: a.role_name_snapshot || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Per Event",
      working_dates: Array.isArray(a.working_dates) ? a.working_dates : []
    });
  }

  for (const a of activeSvcAsgns) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    scheduleItems.push({
      id: a.id,
      type: "service",
      event_id: ev.id,
      event_title: ev.title || "",
      event_type: ev.event_type || "",
      start_date: ev.start_date || "",
      end_date: ev.end_date || "",
      venue: ev.venue || "",
      event_status: ev.status || "upcoming",
      role_name: a.service_name_snapshot || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Fixed",
      working_dates: []
    });
  }

  // Sort: upcoming first (by start_date asc), then past (by start_date desc)
  const upcoming = scheduleItems
    .filter((s) => (s.end_date || s.start_date) >= now)
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1));
  const past = scheduleItems
    .filter((s) => (s.end_date || s.start_date) < now)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  // Build projects list (unique events)
  const projectMap = {};
  for (const s of scheduleItems) {
    if (!projectMap[s.event_id]) {
      projectMap[s.event_id] = {
        id: s.event_id,
        title: s.event_title,
        event_type: s.event_type,
        start_date: s.start_date,
        end_date: s.end_date,
        venue: s.venue,
        status: s.event_status,
        roles: [],
        total_earnings: 0
      };
    }
    if (s.role_name && !projectMap[s.event_id].roles.includes(s.role_name)) {
      projectMap[s.event_id].roles.push(s.role_name);
    }
    projectMap[s.event_id].total_earnings += s.agreed_rate;
  }
  const projects = Object.values(projectMap)
    .filter((p) => p.status !== "cancelled")
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  return {
    member: {
      id: teamMemberId,
      name: memberRecord?.name || nameFallback,
      email: emailOverride || memberRecord?.email || "",
      phone: memberRecord?.phone || "",
      profession: memberRecord?.profession || ""
    },
    workspace: {
      id: workspaceId,
      name: workspace?.name || "",
      logo: workspace?.logo || "",
      phone: workspace?.phone || "",
      email: workspace?.email || "",
      currency
    },
    summary: {
      totalBookings: scheduleItems.length,
      upcomingCount: upcoming.length,
      totalEarnings: round2(totalEarnings),
      totalPaid: round2(totalPaid),
      remaining: round2(remaining)
    },
    upcoming: upcoming.map((s) => ({
      ...s,
      agreed_rate: round2(s.agreed_rate)
    })),
    past: past.map((s) => ({
      ...s,
      agreed_rate: round2(s.agreed_rate)
    })),
    projects: projects.map((p) => ({
      ...p,
      total_earnings: round2(p.total_earnings)
    })),
    payments: (transactions || []).map((t) => ({
      id: t.id,
      amount: round2(Number(t.amount) || 0),
      payment_method: t.payment_method || "",
      transaction_date: t.transaction_date || "",
      reference_number: t.reference_number || "",
      notes: t.notes || ""
    }))
  };
}