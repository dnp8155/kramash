import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { todayStr } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { workspace_id, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
      { workspace_id, status: "ACTIVE" }, "-created_date", 50
    );
    for (const s of existing || []) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: "CANCELLED", note: "Downgraded to Free"
      });
    }

    const plans = await base44.asServiceRole.entities.Plan.filter({ code: "FREE" }, "-created_date", 10);
    const freePlan = (plans && plans[0]) || null;
    if (freePlan) {
      await base44.asServiceRole.entities.WorkspaceSubscription.create({
        workspace_id, plan_id: freePlan.id, pricing_id: "", status: "ACTIVE",
        started_at: todayStr(), expires_at: "", auto_renew: false, source: "ADMIN",
        assigned_price: 0, billing_cycle_snapshot: "", note: note || "Admin downgraded to Free"
      });
    }

    await base44.asServiceRole.entities.Workspace.update(workspace_id, {
      plan_type: "free", plan_status: "active"
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}