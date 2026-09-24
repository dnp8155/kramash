// getTeamPortalData — Authenticated team member portal data (invited-user path).
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { buildTeamPortalData } from "../_shared/teamPortalData.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();

    let teamMemberId = profile?.linked_team_member_id || "";
    let workspaceId = profile?.linked_workspace_id || "";
    let wasAutoLinked = false;

    if (profile?.role !== "team_member" || !teamMemberId) {
      const { data: teamMembers } = await supabaseAdmin
        .from("team_members")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(10);
      const match = (teamMembers || []).find((m) => !m.is_self);
      if (match) {
        teamMemberId = match.id;
        workspaceId = match.workspace_id || workspaceId;
        try {
          await supabaseAdmin.from("profiles").update({ role: "team_member", linked_team_member_id: teamMemberId, linked_workspace_id: workspaceId }).eq("id", user.id);
          wasAutoLinked = true;
        } catch {}
      }
    }

    if (!teamMemberId || !workspaceId) {
      return Response.json({ error: "Your account is not linked to any team member record. Please contact your service provider to invite you to the portal." }, { status: 404 });
    }

    const data = await buildTeamPortalData(teamMemberId, workspaceId, {
      emailOverride: user.email,
      memberNameFallback: user.user_metadata?.full_name || user.email
    });

    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});