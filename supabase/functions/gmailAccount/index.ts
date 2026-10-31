import { withCors } from "../_shared/cors.ts";
// gmailAccount — Preferences → Connections: is Gmail connected, start connecting, disconnect.
//   { action: "status" | "start" | "disconnect", workspace_id }
// The saved Gmail token never leaves the server; the browser only sees the connected address.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { isProWorkspace, getGmailAccount } from "../_shared/clientEmail.ts";
import { GMAIL_SCOPES, gmailConfigured, redirectUri, revokeToken, signState } from "../_shared/gmail.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
    const { action, workspace_id } = await req.json().catch(() => ({}));
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    // Independent lookups, so they run together instead of one after another.
    const [isMember, { data: ws }] = await Promise.all([
      verifyWorkspaceMembership(user.id, workspace_id),
      supabaseAdmin.from("workspaces").select("id, owner_user_id").eq("id", workspace_id).single(),
    ]);
    if (!isMember) return Response.json({ error: "Not a member of this workspace" }, { status: 403 });
    const isOwner = ws?.owner_user_id === user.id;

    if (action === "status") {
      const account = await getGmailAccount(workspace_id);
      return Response.json({
        configured: gmailConfigured(),
        connected: !!account && account.status === "active",
        needs_reconnect: !!account && account.status !== "active",
        email: account?.email || null,
      });
    }

    // Connecting or disconnecting changes who emails go out as, so only the workspace owner can do it.
    if (!isOwner) return Response.json({ error: "Only the workspace owner can change the Gmail connection" }, { status: 403 });

    if (action === "start") {
      if (!(await isProWorkspace(workspace_id, ws?.owner_user_id))) return Response.json({ error: "Emailing clients from Gmail is a Pro feature" }, { status: 402 });
      if (!gmailConfigured()) return Response.json({ error: "Gmail is not set up on the server yet" }, { status: 503 });
      const state = await signState({ w: workspace_id, u: user.id });
      const params = new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_GMAIL_CLIENT_ID") || "",
        redirect_uri: redirectUri(),
        response_type: "code",
        scope: GMAIL_SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      });
      return Response.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }

    if (action === "disconnect") {
      const account = await getGmailAccount(workspace_id);
      if (account) {
        await revokeToken(account);
        await supabaseAdmin.from("messaging_accounts").delete().eq("id", account.id);
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}));
