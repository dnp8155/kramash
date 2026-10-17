import { withCors } from "../_shared/cors.ts";
// assignProSubscription — Admin assigns Pro subscription to a workspace.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { computeExpiry, PLAN_CODES } from "../_shared/planEngine.ts";

// Max workspaces that can receive the free launch month. Keep in sync with LAUNCH_FREE_MONTH_CAP in src/constants/launchOffer.js.
const LAUNCH_FREE_MONTH_CAP = 80;

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { workspace_id, pricing_id, start_date, note, launch_offer } = body;
    if (!workspace_id || !pricing_id || !start_date) return Response.json({ error: "workspace_id, pricing_id, start_date required" }, { status: 400 });

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
    if (!pricing) return Response.json({ error: "Pricing not found" }, { status: 404 });

    const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", PLAN_CODES.PRO);
    const proPlan = plans && plans[0];
    if (!proPlan) return Response.json({ error: "Pro plan not configured" }, { status: 500 });

    // Free launch month: a one-time 1-month grant, capped, recorded as PROMOTIONAL at ₹0.
    const isLaunch = launch_offer === true;
    if (isLaunch) {
      if (pricing.billing_cycle !== "MONTHLY" || (pricing.duration_months || 1) !== 1) {
        return Response.json({ error: "The launch offer is 1 month — pick the Monthly option" }, { status: 400 });
      }
      const { count: used } = await supabaseAdmin.from("workspace_subscriptions").select("id", { count: "exact", head: true }).eq("source", "PROMOTIONAL");
      const { data: already } = await supabaseAdmin.from("workspace_subscriptions").select("id").eq("workspace_id", workspace_id).eq("source", "PROMOTIONAL").limit(1);
      if (already && already.length > 0) return Response.json({ error: "This workspace already used its free launch month" }, { status: 400 });
      if ((used || 0) >= LAUNCH_FREE_MONTH_CAP) return Response.json({ error: `All ${LAUNCH_FREE_MONTH_CAP} launch spots are used` }, { status: 400 });
    }

    const expiresAt = computeExpiry(start_date, pricing.duration_months || 1);

    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspace_id).eq("status", "ACTIVE");
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({ status: "CANCELLED", note: "Replaced by new Pro assignment" }).eq("id", s.id);
    }

    const { data: sub } = await supabaseAdmin.from("workspace_subscriptions").insert({
      workspace_id, plan_id: proPlan.id, pricing_id, status: "ACTIVE",
      started_at: start_date, expires_at: expiresAt, auto_renew: false, source: isLaunch ? "PROMOTIONAL" : "ADMIN",
      assigned_price: isLaunch ? 0 : pricing.price, billing_cycle_snapshot: pricing.billing_cycle,
      updated_by: user.id, note: isLaunch ? `Launch offer — free 1 month${note ? ": " + note : ""}` : (note || "Admin assigned Pro")
    }).select("*").single();

    await supabaseAdmin.from("workspaces").update({ plan_type: "pro", plan_status: "active" }).eq("id", workspace_id);

    return Response.json({ ok: true, subscription_id: sub.id, expires_at: expiresAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));