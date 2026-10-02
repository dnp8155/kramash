import { withCors } from "../_shared/cors.ts";
// downgradeToFree — Admin downgrades a workspace to Free plan.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { PLAN_CODES } from "../_shared/planEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { workspace_id, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspace_id).eq("status", "ACTIVE");
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({ status: "CANCELLED", note: "Downgraded to Free" }).eq("id", s.id);
    }

    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.FREE);
    const freePlan = plans && plans[0];
    if (freePlan) {
      const today = new Date().toISOString().split("T")[0];
      await supabaseAdmin.from("workspace_subscriptions").insert({
        workspace_id, plan_id: freePlan.id, pricing_id: "", status: "ACTIVE",
        started_at: today, expires_at: "", auto_renew: false, source: "ADMIN",
        assigned_price: 0, billing_cycle_snapshot: "", updated_by: user.id, note: note || "Admin downgraded to Free"
      });
    }

    await supabaseAdmin.from("workspaces").update({ plan_type: "free", plan_status: "active" }).eq("id", workspace_id);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));