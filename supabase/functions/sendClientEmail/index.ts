import { withCors } from "../_shared/cors.ts";
// sendClientEmail — "Send email" in the Send message sheet: sends from the workspace's own Gmail (it lands in their
// Sent folder), records it in message_log with tracking. The recipient is always the client's email on file.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { getGmailAccount, isProWorkspace, sendClientEmailNow } from "../_shared/clientEmail.ts";

const DAILY_LIMIT = 300; // Gmail itself allows about 500 a day; leave room for the studio's own mail

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
    const b = await req.json().catch(() => ({}));
    const { workspace_id, client_id, event_id, subject, body, template_id, template_name } = b;
    if (!workspace_id || !client_id || !String(body || "").trim()) return Response.json({ error: "workspace_id, client_id and body are required" }, { status: 400 });
    if (!(await verifyWorkspaceMembership(user.id, workspace_id))) return Response.json({ error: "Not a member of this workspace" }, { status: 403 });

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    if (!workspace) return Response.json({ error: "Workspace not found" }, { status: 404 });
    if (!(await isProWorkspace(workspace_id, workspace.owner_user_id))) return Response.json({ error: "Emailing clients from Gmail is a Pro feature" }, { status: 402 });

    const account = await getGmailAccount(workspace_id);
    if (!account) return Response.json({ error: "Connect Gmail in Preferences first" }, { status: 409 });
    if (account.status !== "active") return Response.json({ error: "Your Gmail connection expired. Reconnect Gmail in Preferences." }, { status: 409 });

    const { data: client } = await supabaseAdmin.from("clients").select("*").eq("id", client_id).eq("workspace_id", workspace_id).single();
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabaseAdmin.from("message_log").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id).eq("channel", "email").gte("created_at", since);
    if ((count || 0) >= DAILY_LIMIT) return Response.json({ error: "Daily email limit reached. Try again tomorrow." }, { status: 429 });

    const result = await sendClientEmailNow({
      workspace, account, client, eventId: event_id, subject: String(subject || "").slice(0, 300), body: String(body).slice(0, 20000),
      templateId: template_id, templateName: template_name, createdBy: user.id,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
    return Response.json({ sent: true, to: client.email });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}));
