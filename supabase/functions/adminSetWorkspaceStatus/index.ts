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
      const { error: subErr } = await supabaseAdmin.from("workspace_subscriptions").update({
        status: subscriptionStatus, updated_by: user.id,
        note: note || (status === "SUSPENDED" ? "Workspace suspended" : "Workspace reactivated")
      }).eq("id", s.id);
      if (subErr) return Response.json({ error: `Subscription update failed: ${subErr.message}` }, { status: 500 });
    }

    const planStatus = status === "SUSPENDED" ? "suspended" : "active";
    const { data: updated, error: wsErr } = await supabaseAdmin.from("workspaces").update({ plan_status: planStatus }).eq("id", workspace_id).select("plan_status");
    if (wsErr) return Response.json({ error: `Workspace update failed: ${wsErr.message}` }, { status: 500 });
    if (!updated || !updated.length) return Response.json({ error: "Workspace not found" }, { status: 404 });

    return Response.json({ ok: true, status: subscriptionStatus, plan_status: updated[0].plan_status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));