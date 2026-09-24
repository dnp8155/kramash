// updateTeamPortalPassword — Admin regenerates team member portal password.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { generatePassword, hashPassword } from "../_shared/portalCrypto.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_member_id, workspace_id, password, auto_generate } = body;
    if (!team_member_id || !workspace_id) {
      return Response.json({ error: "team_member_id and workspace_id are required" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Only workspace members can manage portal access" }, { status: 403 });

    const { data: teamMember } = await supabaseAdmin.from("team_members").select("*").eq("id", team_member_id).single();
    if (!teamMember || teamMember.workspace_id !== workspace_id) {
      return Response.json({ error: "Team member not found in this workspace" }, { status: 404 });
    }
    if (teamMember.is_self) return Response.json({ error: "Portal access is not available for the workspace owner" }, { status: 400 });
    if (!teamMember.portal_access_enabled) return Response.json({ error: "Portal access is not enabled for this team member" }, { status: 400 });

    const newPassword = (auto_generate || !password) ? generatePassword() : String(password).trim();
    if (newPassword.length < 4) return Response.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    const passwordHash = await hashPassword(newPassword);

    await supabaseAdmin.from("team_members").update({ portal_password_hash: passwordHash }).eq("id", team_member_id);

    return Response.json({ success: true, password: newPassword });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});