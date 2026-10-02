import { withCors } from "../_shared/cors.ts";
// updateClientPortalPassword — Workspace admin changes a client's portal password.
// If auto_generate is true (or no password is provided), a new random password
// is generated. The new plaintext password is returned ONCE.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/clientPortalData.ts";
import { generatePassword, hashPassword } from "../_shared/portalCrypto.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { client_id, workspace_id, password, auto_generate } = body;

    if (!client_id || !workspace_id) {
      return Response.json({ error: "client_id and workspace_id are required" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: "Only workspace members can manage portal access" }, { status: 403 });
    }

    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();
    if (clientErr || !client || client.workspace_id !== workspace_id) {
      return Response.json({ error: "Client not found in this workspace" }, { status: 404 });
    }
    if (!client.portal_access_enabled) {
      return Response.json({ error: "Portal access is not enabled for this client" }, { status: 400 });
    }

    const newPassword = (auto_generate || !password) ? generatePassword() : String(password).trim();
    if (newPassword.length < 4) {
      return Response.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);

    await supabaseAdmin
      .from("clients")
      .update({ portal_password_hash: passwordHash })
      .eq("id", client_id);

    return Response.json({ success: true, password: newPassword });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));