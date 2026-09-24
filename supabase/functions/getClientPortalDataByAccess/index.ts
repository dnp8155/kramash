// getClientPortalDataByAccess — Powers the password-only portal path. Validates
// the session token (issued by verifyClientPortalAccess) against the stored
// access token + enabled flag, then returns the same portal payload shape.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { buildClientPortalData } from "../_shared/clientPortalData.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, client_id } = body;

    if (!session_token || !client_id) {
      return Response.json({ error: "Session token and client id are required" }, { status: 400 });
    }

    const { data: clients, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .eq("portal_access_token", session_token)
      .eq("portal_access_enabled", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !clients || clients.length === 0) {
      return Response.json({ error: "Your portal session is no longer active. Please sign in again." }, { status: 401 });
    }

    const client = clients[0];
    const data = await buildClientPortalData(client.id, client.workspace_id, {
      emailOverride: client.email,
    });

    return Response.json({ auto_linked: false, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});