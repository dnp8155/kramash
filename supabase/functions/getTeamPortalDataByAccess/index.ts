import { withCors } from "../_shared/cors.ts";
// getTeamPortalDataByAccess — Password-only team portal session data.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { buildTeamPortalData } from "../_shared/teamPortalData.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, team_member_id } = body;
    if (!session_token || !team_member_id) {
      return Response.json({ error: "Session token and team member id are required" }, { status: 400 });
    }

    const { data: teamMembers } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("id", team_member_id)
      .eq("portal_access_token", session_token)
      .eq("portal_access_enabled", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ error: "Your portal session is no longer active. Please sign in again." }, { status: 401 });
    }

    const teamMember = teamMembers[0];
    const data = await buildTeamPortalData(teamMember.id, teamMember.workspace_id, { emailOverride: teamMember.email });

    return Response.json({ auto_linked: false, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));