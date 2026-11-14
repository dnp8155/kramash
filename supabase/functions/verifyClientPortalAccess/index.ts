import { withCors } from "../_shared/cors.ts";
// verifyClientPortalAccess — Public endpoint: a client opens their unique link
// (/client-login/<token>), enters only a password, and this validates it.
// On success returns a session token (= the access token) + client identity.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { verifyPassword } from "../_shared/portalCrypto.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: "Token and password are required" }, { status: 400 });
    }

    const { data: clients, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("portal_access_token", token)
      .eq("portal_access_enabled", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !clients || clients.length === 0) {
      return Response.json({ error: "This link is no longer active. Please contact your service provider." }, { status: 404 });
    }

    const client = clients[0];
    const ok = await verifyPassword(String(password), client.portal_password_hash || "");
    if (!ok) {
      return Response.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    return Response.json({
      success: true,
      session_token: client.portal_access_token,
      client_id: client.id,
      workspace_id: client.workspace_id,
      client_name: client.name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));