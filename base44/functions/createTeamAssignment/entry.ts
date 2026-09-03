import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";

// Backend-protected team assignment creation.
// Validates workspace membership, event ownership, and prevents duplicate
// SELF (owner) assignment within the same event.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const {
      workspace_id, event_id, team_member_id,
      role_id, role_name_snapshot, member_type_id, member_type_snapshot,
      agreed_rate, rate_type, working_dates,
      booking_start_date, booking_end_date, notes
    } = body;

    if (!workspace_id || !event_id || !team_member_id) {
      return Response.json({ error: "workspace_id, event_id, and team_member_id are required." }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Verify event belongs to workspace
    const ev = await base44.entities.Event.get(event_id);
    if (!ev || ev.workspace_id !== workspace_id) {
      return Response.json({ error: "Event not found in this workspace." }, { status: 404 });
    }

    // Verify team member belongs to workspace
    const member = await base44.entities.TeamMember.get(team_member_id);
    if (!member || member.workspace_id !== workspace_id) {
      return Response.json({ error: "Team member not found in this workspace." }, { status: 404 });
    }

    // Check for existing active assignment (same member, same event)
    const existing = await base44.entities.EventTeamAssignment.filter({
      workspace_id, event_id, team_member_id, assignment_status: "assigned"
    });
    if (existing && existing.length > 0) {
      if (member.is_self) {
        return Response.json({
          error: "SELF_ALREADY_ASSIGNED",
          message: "Owner / Self is already assigned to this event."
        }, { status: 409 });
      }
      return Response.json({
        error: "ALREADY_ASSIGNED",
        message: `${member.name} is already assigned to this event.`
      }, { status: 409 });
    }

    // Create the assignment
    const sortedDates = Array.isArray(working_dates) ? [...working_dates].sort() : [];
    const created = await base44.entities.EventTeamAssignment.create({
      workspace_id,
      event_id,
      team_member_id,
      role_id: role_id || "",
      role_name_snapshot: role_name_snapshot || "",
      member_type_id: member_type_id || "",
      member_type_snapshot: member_type_snapshot || "",
      agreed_rate: Number(agreed_rate) || 0,
      rate_type: rate_type || "Per Event",
      working_dates: sortedDates,
      booking_start_date: booking_start_date || (sortedDates[0] || ""),
      booking_end_date: booking_end_date || (sortedDates[sortedDates.length - 1] || sortedDates[0] || ""),
      assignment_status: "assigned",
      notes: (notes || "").trim()
    });

    // Sync event.team_member_ids
    const currentIds = Array.isArray(ev.team_member_ids) ? ev.team_member_ids : [];
    if (!currentIds.includes(team_member_id)) {
      await base44.entities.Event.update(event_id, {
        team_member_ids: [...currentIds, team_member_id]
      });
    }

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}