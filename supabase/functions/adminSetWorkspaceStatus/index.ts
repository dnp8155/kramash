import { withCors } from "../_shared/cors.ts";
// adminSetWorkspaceStatus — Admin: suspend/unsuspend a workspace.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { SUB_STATUS } from "../_shared/planEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { workspace_id, status, note } = body;
    if (!workspace_id || !status) return Response.json({ error: "workspace_id, status required" }, { status: 400 });
    const subscriptionStatus = status === "SUSPENDED" ? SUB_STATUS.SUSPENDED : SUB_STATUS.ACTIVE;

    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspace_id).in("status", [SUB_STATUS.ACTIVE, SUB_STATUS.SUSPENDED]);
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({
        status: subscriptionStatus, updated_by: user.id,
        note: note || (status === "SUSPENDED" ? "Workspace suspended" : "Workspace reactivated")
      }).eq("id", s.id);
    }

    await supabaseAdmin.from("workspaces").update({ plan_status: status === "SUSPENDED" ? "suspended" : "active" }).eq("id", workspace_id);

    return Response.json({ ok: true, status: subscriptionStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));