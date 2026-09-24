// downgradeToFree — Admin or self-service: downgrade a workspace to FREE plan.
// Ported from supabase/functions/downgradeToFree — uses Supabase admin client.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { PLAN_CODES, SUB_STATUS, verifyWorkspaceMembership } from "../../shared/planEngine.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const isAdmin = user.role === "admin";
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isAdmin && !isMember) return Response.json({ error: "Not authorized for this workspace" }, { status: 403 });

    const { data: activeSubs } = await supabaseAdmin
      .from("workspace_subscriptions")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", SUB_STATUS.ACTIVE);

    for (const s of activeSubs || []) {
      await supabaseAdmin
        .from("workspace_subscriptions")
        .update({ status: SUB_STATUS.CANCELLED, note: "Downgraded to FREE", updated_by: user.id })
        .eq("id", s.id);
    }

    const { data: freePlans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.FREE);
    const freePlan = (freePlans && freePlans[0]) || null;
    const startDate = new Date().toISOString().split("T")[0];

    if (freePlan) {
      await supabaseAdmin
        .from("workspace_subscriptions")
        .insert({
          workspace_id, plan_id: freePlan.id, status: SUB_STATUS.ACTIVE,
          started_at: startDate, source: "ADMIN", updated_by: user.id, note: "Downgraded to FREE"
        });
    }

    await supabaseAdmin.from("workspaces").update({ plan_type: "free", plan_status: "active" }).eq("id", workspace_id);

    return Response.json({ ok: true, plan_code: PLAN_CODES.FREE });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}