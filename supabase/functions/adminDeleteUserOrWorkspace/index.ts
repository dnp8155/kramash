import { withCors } from "../_shared/cors.ts";
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized: Admin access required" }, { status: 403 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { workspace_id, user_id, purge_owner_user = true } = body;

    if (!workspace_id && !user_id) {
      return Response.json({ error: "workspace_id or user_id is required" }, { status: 400 });
    }

    let targetWorkspaceId = workspace_id;
    let targetUserId = user_id;

    if (targetWorkspaceId && !targetUserId) {
      const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", targetWorkspaceId).single();
      if (ws?.owner_user_id) targetUserId = ws.owner_user_id;
    } else if (!targetWorkspaceId && targetUserId) {
      const { data: ws } = await supabaseAdmin.from("workspaces").select("id").eq("owner_user_id", targetUserId).maybeSingle();
      if (ws?.id) targetWorkspaceId = ws.id;
    }

    // 1. Delete all workspace child entity records if workspaceId exists
    if (targetWorkspaceId) {
      const tablesToDelete = [
        "events",
        "clients",
        "quotations",
        "invoices",
        "payment_milestones",
        "team_members",
        "transactions",
        "leads",
        "notifications",
        "push_subscriptions",
        "workspace_subscriptions",
        "expense_categories",
        "services",
        "team_roles",
        "job_sheets",
        "workspace_members"
      ];

      for (const table of tablesToDelete) {
        try {
          await supabaseAdmin.from(table).delete().eq("workspace_id", targetWorkspaceId);
        } catch { /* best-effort cleanup */ }
      }

      // Delete the workspace itself
      await supabaseAdmin.from("workspaces").delete().eq("id", targetWorkspaceId);
    }

    // 2. Cascade purge user profile and auth account if targetUserId exists & purge requested
    if (targetUserId && purge_owner_user) {
      // Clean push subscriptions for user
      await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", targetUserId);
      // Clean notifications for user
      await supabaseAdmin.from("notifications").delete().eq("user_id", targetUserId);
      // Clean workspace members for user
      await supabaseAdmin.from("workspace_members").delete().eq("user_id", targetUserId);
      // Clean profile record
      await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);

      // Permanent wipe from Supabase Auth (auth.users)
      const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authDeleteErr) {
        console.error("Auth user delete note:", authDeleteErr.message);
      }
    }

    return Response.json({
      ok: true,
      purgedWorkspaceId: targetWorkspaceId || null,
      purgedUserId: targetUserId || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
