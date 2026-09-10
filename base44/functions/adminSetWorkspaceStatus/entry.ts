import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { SUB_STATUS } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { workspace_id, status, note } = body;
    if (!workspace_id || !status) {
      return Response.json({ error: "workspace_id, status required" }, { status: 400 });
    }
    // status: "ACTIVE" (unsuspend) or "SUSPENDED"
    const subscriptionStatus = status === "SUSPENDED" ? SUB_STATUS.SUSPENDED : SUB_STATUS.ACTIVE;

    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({
      workspace_id: workspace_id,
      status: { $in: [SUB_STATUS.ACTIVE, SUB_STATUS.SUSPENDED] }
    });
    for (const s of existing || []) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: subscriptionStatus,
        updated_by: user.id,
        note: note || (status === "SUSPENDED" ? "Workspace suspended" : "Workspace reactivated")
      });
    }

    await base44.asServiceRole.entities.Workspace.update(workspace_id, {
      plan_status: status === "SUSPENDED" ? "suspended" : "active"
    });

    return Response.json({ ok: true, status: subscriptionStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}