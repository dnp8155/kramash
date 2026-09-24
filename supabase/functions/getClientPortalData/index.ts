// getClientPortalData — Authenticated endpoint for client-role users (invited
// via email). Returns all events, quotations, invoices, and payment history
// for the logged-in client. Auto-links by email if not yet linked.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { buildClientPortalData } from "../_shared/clientPortalData.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get the user's profile (may have linked_client_id / linked_workspace_id)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let clientId = profile?.linked_client_id || "";
    let workspaceId = profile?.linked_workspace_id || "";
    let wasAutoLinked = false;

    // If the user is not yet role "client" or has no linked client, try auto-link by email.
    if (profile?.role !== "client" || !clientId) {
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(10);

      if (clients && clients.length > 0) {
        clientId = clients[0].id;
        workspaceId = clients[0].workspace_id || workspaceId;

        // Upgrade the user's role to "client" and persist the link
        try {
          await supabaseAdmin
            .from("profiles")
            .update({
              role: "client",
              linked_client_id: clientId,
              linked_workspace_id: workspaceId,
            })
            .eq("id", user.id);
          wasAutoLinked = true;
        } catch (e) {
          // If we can't update the role, continue anyway — we have the client link
        }
      }
    }

    if (!clientId || !workspaceId) {
      return Response.json({
        error: "Your account is not linked to any client record. Please contact your service provider to invite you to the portal.",
      }, { status: 404 });
    }

    const data = await buildClientPortalData(clientId, workspaceId, {
      emailOverride: user.email,
      clientNameFallback: user.user_metadata?.full_name || user.email,
    });

    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});