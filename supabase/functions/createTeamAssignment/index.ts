// createTeamAssignment — Backend-protected team assignment creation.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
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

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: ev } = await supabaseAdmin.from("events").select("*").eq("id", event_id).single();
    if (!ev || ev.workspace_id !== workspace_id) {
      return Response.json({ error: "Event not found in this workspace." }, { status: 404 });
    }

    const { data: member } = await supabaseAdmin.from("team_members").select("*").eq("id", team_member_id).single();
    if (!member || member.workspace_id !== workspace_id) {
      return Response.json({ error: "Team member not found in this workspace." }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from("event_team_assignments")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("event_id", event_id)
      .eq("team_member_id", team_member_id)
      .eq("assignment_status", "assigned")
      .limit(1);
    if (existing && existing.length > 0) {
      if (member.is_self) {
        return Response.json({ error: "SELF_ALREADY_ASSIGNED", message: "Owner / Self is already assigned to this event." }, { status: 409 });
      }
      return Response.json({ error: "ALREADY_ASSIGNED", message: `${member.name} is already assigned to this event.` }, { status: 409 });
    }

    const sortedDates = Array.isArray(working_dates) ? [...working_dates].sort() : [];
    const { data: created, error } = await supabaseAdmin
      .from("event_team_assignments")
      .insert({
        workspace_id, event_id, team_member_id,
        role_id: role_id || "", role_name_snapshot: role_name_snapshot || "",
        member_type_id: member_type_id || "", member_type_snapshot: member_type_snapshot || "",
        agreed_rate: Number(agreed_rate) || 0, rate_type: rate_type || "Per Event",
        working_dates: sortedDates,
        booking_start_date: booking_start_date || (sortedDates[0] || ""),
        booking_end_date: booking_end_date || (sortedDates[sortedDates.length - 1] || sortedDates[0] || ""),
        assignment_status: "assigned", notes: (notes || "").trim()
      })
      .select("*")
      .single();
    if (error) throw error;

    const currentIds = Array.isArray(ev.team_member_ids) ? ev.team_member_ids : [];
    if (!currentIds.includes(team_member_id)) {
      await supabaseAdmin.from("events").update({ team_member_ids: [...currentIds, team_member_id] }).eq("id", event_id);
    }

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});