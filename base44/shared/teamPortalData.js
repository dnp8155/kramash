// Team portal data builder for team-member-facing portal.
export async function buildTeamPortalData(base44, teamMemberId, workspaceId) {
  let workspace = null;
  try { workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId); } catch (e) { }

  const teamMember = await base44.asServiceRole.entities.TeamMember.get(teamMemberId);

  const assignments = await base44.asServiceRole.entities.EventTeamAssignment.filter(
    { workspace_id: workspaceId, team_member_id: teamMemberId, assignment_status: "assigned" }, "-created_date", 200
  );

  const eventIds = Array.from(new Set((assignments || []).map((a) => a.event_id).filter(Boolean)));
  const events = eventIds.length
    ? await base44.asServiceRole.entities.Event.filter({ id: { $in: eventIds } }, "-start_date", eventIds.length)
    : [];
  const eventMap = new Map((events || []).map((e) => [e.id, e]));

  const blockDates = await base44.asServiceRole.entities.TeamBlockDate.filter(
    { workspace_id: workspaceId, team_member_id: teamMemberId, status: "active" }, "-start_date", 200
  );

  const teamPayments = await base44.asServiceRole.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, team_member_id: teamMemberId, transaction_type: "TEAM_PAYMENT", status: "ACTIVE" }, "-transaction_date", 200
  );

  const totalEarned = (teamPayments || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalAssigned = (assignments || []).reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const balanceDue = Math.max(0, totalAssigned - totalEarned);

  return {
    team_member: {
      id: teamMember.id,
      name: teamMember.name || "",
      phone: teamMember.phone || "",
      email: teamMember.email || "",
      profile_image: teamMember.profile_image || ""
    },
    workspace: { id: workspaceId, name: workspace?.name || "", logo: workspace?.logo || "", phone: workspace?.phone || "" },
    summary: {
      totalEvents: (assignments || []).length,
      totalAssigned,
      totalPaid: totalEarned,
      balanceDue
    },
    assignments: (assignments || []).map((a) => {
      const ev = eventMap.get(a.event_id) || {};
      return {
        id: a.id,
        event_id: a.event_id,
        event_title: ev.title || "",
        event_type: ev.event_type || "",
        start_date: ev.start_date || "",
        end_date: ev.end_date || "",
        venue: ev.venue || "",
        role_name: a.role_name_snapshot || "",
        member_type: a.member_type_snapshot || "",
        rate_type: a.rate_type || "Per Event",
        agreed_rate: Number(a.agreed_rate) || 0,
        working_dates: a.working_dates || [],
        booking_start_date: a.booking_start_date || "",
        booking_end_date: a.booking_end_date || ""
      };
    }),
    block_dates: (blockDates || []).map((b) => ({
      id: b.id,
      start_date: b.start_date || "",
      end_date: b.end_date || "",
      reason: b.reason || "Leave"
    })),
    payments: (teamPayments || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      payment_method: p.payment_method || "",
      transaction_date: p.transaction_date || "",
      reference_number: p.reference_number || ""
    }))
  };
}