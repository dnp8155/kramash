import { withCors } from "../_shared/cors.ts";
// initWorkspaceSubscription — the Free plan row every new workspace gets (source ONBOARDING), so Admin shows its
// plan history. The app can't write workspace_subscriptions itself (RLS: platform admin only), so onboarding calls
// this. Safe to call twice: an existing row is left alone. Starter services are added by onboarding, not here.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { PLAN_CODES } from "../_shared/planEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { workspace_id } = body || {};
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    // Only the workspace's owner sets up its plan.
    const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id, role").eq("workspace_id", workspace_id).eq("user_id", user.id).limit(1);
    if (!memberships || memberships.length === 0 || memberships[0].role !== "owner") {
      return Response.json({ error: "Not the workspace owner" }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("id").eq("workspace_id", workspace_id).limit(1);
    if (existing && existing.length > 0) return Response.json({ ok: true, already_exists: true });

    const { data: plans } = await supabaseAdmin.from("plans").select("id").eq("code", PLAN_CODES.FREE).limit(1);
    const freePlan = plans && plans[0];
    if (!freePlan) return Response.json({ error: "Free plan not configured" }, { status: 500 });

    // Today in India time (the app's default zone), as a plain date.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    // Empty values are NULL, not "": pricing_id is a UUID and expires_at a DATE, and "" is rejected by both.
    // created_by_id = the owner, or the row is invisible to them (read RLS is created_by_id = auth.uid()).
    const { data: sub, error: insertError } = await supabaseAdmin.from("workspace_subscriptions").insert({
      workspace_id, plan_id: freePlan.id, pricing_id: null, status: "ACTIVE",
      started_at: today, expires_at: null, auto_renew: false, source: "ONBOARDING",
      assigned_price: 0, billing_cycle_snapshot: null, updated_by: user.id, created_by_id: user.id,
      note: "Initial Free plan",
    }).select("id").single();
    if (insertError || !sub) return Response.json({ error: insertError?.message || "Could not create the Free plan" }, { status: 500 });

    return Response.json({ ok: true, subscription_id: sub.id });
  } catch (error) {
    return Response.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}));
