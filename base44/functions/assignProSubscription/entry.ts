import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { computeExpiry, PLAN_CODES } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { workspace_id, pricing_id, start_date, note } = body;
    if (!workspace_id || !pricing_id || !start_date) {
      return Response.json({ error: "workspace_id, pricing_id, start_date required" }, { status: 400 });
    }

    const pricing = await base44.asServiceRole.entities.PlanPricing.get(pricing_id);
    if (!pricing) return Response.json({ error: "Pricing not found" }, { status: 404 });

    const plans = await base44.asServiceRole.entities.Plan.filter({ code: PLAN_CODES.PRO });
    const proPlan = plans && plans[0];
    if (!proPlan) return Response.json({ error: "Pro plan not configured" }, { status: 500 });

    const expiresAt = computeExpiry(start_date, pricing.duration_months || 1);

    // Cancel any existing ACTIVE subscription (preserves history).
    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({
      workspace_id: workspace_id,
      status: "ACTIVE"
    });
    for (const s of existing || []) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: "CANCELLED",
        note: "Replaced by new Pro assignment"
      });
    }

    const sub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
      workspace_id: workspace_id,
      plan_id: proPlan.id,
      pricing_id: pricing_id,
      status: "ACTIVE",
      started_at: start_date,
      expires_at: expiresAt,
      auto_renew: false,
      source: "ADMIN",
      assigned_price: pricing.price,
      billing_cycle_snapshot: pricing.billing_cycle,
      updated_by: user.id,
      note: note || "Admin assigned Pro"
    });

    await base44.asServiceRole.entities.Workspace.update(workspace_id, {
      plan_type: "pro",
      plan_status: "active"
    });

    return Response.json({ ok: true, subscription_id: sub.id, expires_at: expiresAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}