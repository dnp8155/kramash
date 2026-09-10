import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { PLAN_CODES } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { workspace_id, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    // Cancel existing ACTIVE subscription.
    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({
      workspace_id: workspace_id,
      status: "ACTIVE"
    });
    for (const s of existing || []) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: "CANCELLED",
        note: "Downgraded to Free"
      });
    }

    // Create a fresh Free subscription.
    const plans = await base44.asServiceRole.entities.Plan.filter({ code: PLAN_CODES.FREE });
    const freePlan = plans && plans[0];
    if (freePlan) {
      const today = new Date().toISOString().split("T")[0];
      await base44.asServiceRole.entities.WorkspaceSubscription.create({
        workspace_id: workspace_id,
        plan_id: freePlan.id,
        pricing_id: "",
        status: "ACTIVE",
        started_at: today,
        expires_at: "",
        auto_renew: false,
        source: "ADMIN",
        assigned_price: 0,
        billing_cycle_snapshot: "",
        updated_by: user.id,
        note: note || "Admin downgraded to Free"
      });
    }

    await base44.asServiceRole.entities.Workspace.update(workspace_id, {
      plan_type: "free",
      plan_status: "active"
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}