// verifyTeamPortalAccess — Public: team member validates password by token.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { verifyPassword } from "../_shared/portalCrypto.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;
    if (!token || !password) return Response.json({ error: "Token and password are required" }, { status: 400 });

    const { data: teamMembers } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("portal_access_token", token)
      .eq("portal_access_enabled", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ error: "This link is no longer active. Please contact your service provider." }, { status: 404 });
    }

    const teamMember = teamMembers[0];
    const ok = await verifyPassword(String(password), teamMember.portal_password_hash || "");
    if (!ok) return Response.json({ error: "Incorrect password. Please try again." }, { status: 401 });

    return Response.json({
      success: true, session_token: teamMember.portal_access_token,
      team_member_id: teamMember.id, workspace_id: teamMember.workspace_id, team_member_name: teamMember.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});