import { withCors } from "../_shared/cors.ts";
// instagramAccount — My Profile → Instagram: is it connected, start connecting, disconnect.
//   { action: "status" | "start" | "disconnect", workspace_id }
// The saved Instagram token never leaves the server; the browser only sees the connected @username.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { signState } from "../_shared/gmail.ts";
import { forgetInstagramPhotos, getInstagramAccount, instagramConfigured, instagramLoginUrl } from "../_shared/instagram.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
    const { action, workspace_id } = await req.json().catch(() => ({}));
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    const [isMember, { data: ws }] = await Promise.all([
      verifyWorkspaceMembership(user.id, workspace_id),
      supabaseAdmin.from("workspaces").select("id, owner_user_id").eq("id", workspace_id).single(),
    ]);
    if (!isMember) return Response.json({ error: "Not a member of this workspace" }, { status: 403 });
    const isOwner = ws?.owner_user_id === user.id;

    if (action === "status") {
      const account = await getInstagramAccount(workspace_id);
      return Response.json({
        configured: instagramConfigured(),
        connected: !!account && account.status === "active",
        needs_reconnect: !!account && account.status !== "active",
        username: account?.email || null,
      });
    }

    // The page is the owner's, so only the owner can connect or disconnect.
    if (!isOwner) return Response.json({ error: "Only the workspace owner can change the Instagram connection" }, { status: 403 });

    if (action === "start") {
      if (!instagramConfigured()) return Response.json({ error: "Instagram is not set up on the server yet" }, { status: 503 });
      const state = await signState({ w: workspace_id, u: user.id, k: "ig" });
      return Response.json({ url: instagramLoginUrl(state) });
    }

    if (action === "disconnect") {
      await supabaseAdmin.from("messaging_accounts").delete().eq("workspace_id", workspace_id).eq("provider", "instagram");
      forgetInstagramPhotos(workspace_id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}));
