// initWorkspaceSubscription — Create initial Free subscription + seed services.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { PLAN_CODES } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, default_services } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", user.id).limit(1);
    if (!memberships || memberships.length === 0) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("id").eq("workspace_id", workspace_id).limit(1);
    if (existing && existing.length > 0) return Response.json({ ok: true, already_exists: true });

    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.FREE);
    const freePlan = plans && plans[0];
    if (!freePlan) return Response.json({ error: "Free plan not configured" }, { status: 500 });

    const today = new Date().toISOString().split("T")[0];
    const { data: sub } = await supabaseAdmin.from("workspace_subscriptions").insert({
      workspace_id, plan_id: freePlan.id, pricing_id: "", status: "ACTIVE",
      started_at: today, expires_at: "", auto_renew: false, source: "ONBOARDING",
      assigned_price: 0, billing_cycle_snapshot: "", updated_by: user.id, note: "Initial Free plan"
    }).select("*").single();

    const { data: existingServices } = await supabaseAdmin.from("services").select("id").eq("workspace_id", workspace_id).limit(1);
    if ((!existingServices || existingServices.length === 0) && Array.isArray(default_services)) {
      await supabaseAdmin.from("services").insert(default_services.map((s) => ({ ...s, workspace_id, status: "active" })));
    }

    return Response.json({ ok: true, subscription_id: sub.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});