import { withCors } from "../_shared/cors.ts";
// enableTeamPortalAccess — Admin enables/disables team member portal (Self blocked).
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { generateAccessToken, generatePassword, hashPassword } from "../_shared/portalCrypto.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_member_id, workspace_id, action } = body;
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

    if (action === "disable") {
      await supabaseAdmin.from("team_members").update({ portal_access_enabled: false, portal_password_hash: "", portal_access_token: "" }).eq("id", team_member_id);
      return Response.json({ success: true, enabled: false });
    }

    const accessToken = generateAccessToken();
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    await supabaseAdmin.from("team_members").update({ portal_access_token: accessToken, portal_password_hash: passwordHash, portal_access_enabled: true }).eq("id", team_member_id);

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const loginUrl = `${origin}/team-login/${accessToken}`;

    return Response.json({ success: true, enabled: true, password, login_url: loginUrl, access_token: accessToken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));