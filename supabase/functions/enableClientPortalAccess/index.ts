// enableClientPortalAccess — Workspace admin enables (or disables) the
// password-only portal gate for a client. On enable: generates a random
// access token + random password, stores the hashed password + token +
// enabled flag, and returns the plaintext password ONCE. On disable: clears.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/clientPortalData.ts";
import { generateAccessToken, generatePassword, hashPassword } from "../_shared/portalCrypto.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { client_id, workspace_id, action } = body;

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

    if (action === "disable") {
      await supabaseAdmin
        .from("clients")
        .update({
          portal_access_enabled: false,
          portal_password_hash: "",
          portal_access_token: "",
        })
        .eq("id", client_id);
      return Response.json({ success: true, enabled: false });
    }

    // Enable: generate token + password, hash, persist.
    const accessToken = generateAccessToken();
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    await supabaseAdmin
      .from("clients")
      .update({
        portal_access_token: accessToken,
        portal_password_hash: passwordHash,
        portal_access_enabled: true,
      })
      .eq("id", client_id);

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const loginUrl = `${origin}/client-login/${accessToken}`;

    return Response.json({
      success: true,
      enabled: true,
      password, // plaintext — returned ONCE for the admin to share
      login_url: loginUrl,
      access_token: accessToken,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});