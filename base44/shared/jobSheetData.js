// Job sheet data builder for public crew-facing portal.
export async function buildJobSheetData(base44, eventId, workspaceId) {
  let workspace = null;
  try { workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId); } catch (e) { }

  const event = await base44.asServiceRole.entities.Event.get(eventId);

  const teamAssignments = await base44.asServiceRole.entities.EventTeamAssignment.filter(
    { workspace_id: workspaceId, event_id: eventId, assignment_status: "assigned" }, "role_name_snapshot", 200
  );

  const serviceAssignments = await base44.asServiceRole.entities.EventServiceAssignment.filter(
    { workspace_id: workspaceId, event_id: eventId, assignment_status: "assigned" }, "service_name_snapshot", 200
  );

  const dayAssignments = await base44.asServiceRole.entities.EventDayAssignment.filter(
    { workspace_id: workspaceId, event_id: eventId }, "day_date", 100
  );

  const teamMemberIds = Array.from(new Set((teamAssignments || []).map((a) => a.team_member_id).filter(Boolean)));
  const teamMembers = teamMemberIds.length
    ? await base44.asServiceRole.entities.TeamMember.filter({ id: { $in: teamMemberIds } }, "name", teamMemberIds.length)
    : [];

  const memberMap = new Map((teamMembers || []).map((m) => [m.id, m]));

  return {
    workspace: { id: workspaceId, name: workspace?.name || "", logo: workspace?.logo || "", phone: workspace?.phone || "" },
    event: {
      id: event.id,
      title: event.title || "",
      event_type: event.event_type || "",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      venue: event.venue || "",
      address: event.address || "",
      notes: event.notes || ""
    },
    days: (dayAssignments || []).map((d) => ({
      id: d.id,
      day_date: d.day_date || "",
      day_title: d.day_title || "",
      venue: d.venue || "",
      call_time: d.call_time || "",
      notes: d.notes || ""
    })),
    team: (teamAssignments || []).map((a) => {
      const m = memberMap.get(a.team_member_id) || {};
      return {
        id: a.id,
        team_member_id: a.team_member_id,
        name: m.name || a.team_member_name_snapshot || "",
        phone: m.phone || "",
        role_name: a.role_name_snapshot || "",
        member_type: a.member_type_snapshot || "",
        rate_type: a.rate_type || "Per Event",
        agreed_rate: Number(a.agreed_rate) || 0,
        working_dates: a.working_dates || []
      };
    }),
    services: (serviceAssignments || []).map((s) => ({
      id: s.id,
      service_name: s.service_name_snapshot || "",
      provider_name: s.provider_name_snapshot || "",
      agreed_rate: Number(s.agreed_rate) || 0,
      rate_type: s.rate_type || "Fixed",
      is_addon: !!s.is_addon,
      notes: s.notes || ""
    }))
  };
}