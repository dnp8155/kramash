// assignProSubscription — Admin: assign a Pro plan subscription to a workspace.
// Ported from supabase/functions/assignProSubscription — uses Supabase admin client.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { computeExpiry, PLAN_CODES, SUB_STATUS } from "../../shared/planEngine.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id, pricing_id, duration_months, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const { data: ws } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    let proPlan = null;
    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.PRO);
    proPlan = (plans && plans[0]) || null;
    if (!proPlan) return Response.json({ error: "Pro plan not configured" }, { status: 500 });

    let pricing = null;
    if (pricing_id) {
      const { data: p } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
      pricing = p;
    }
    const duration = duration_months || pricing?.duration_months || 1;
    const startDate = new Date().toISOString().split("T")[0];
    const expiresAt = computeExpiry(startDate, duration);

    const { data: existing } = await supabaseAdmin
      .from("workspace_subscriptions")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", SUB_STATUS.ACTIVE);
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({ status: SUB_STATUS.CANCELLED, note: "Replaced by admin assignment" }).eq("id", s.id);
    }

    const { data: sub } = await supabaseAdmin
      .from("workspace_subscriptions")
      .insert({
        workspace_id, plan_id: proPlan.id, pricing_id: pricing?.id || null,
        status: SUB_STATUS.ACTIVE, started_at: startDate, expires_at: expiresAt,
        auto_renew: false, source: "ADMIN",
        assigned_price: pricing?.price || 0, billing_cycle_snapshot: pricing?.billing_cycle || null,
        updated_by: user.id, note: note || "Assigned by admin"
      })
      .select("*")
      .single();

    await supabaseAdmin.from("workspaces").update({ plan_type: "pro", plan_status: "active" }).eq("id", workspace_id);

    return Response.json({ ok: true, subscription: { id: sub?.id, expires_at: expiresAt, plan_code: PLAN_CODES.PRO } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}