import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { workspace_id, status, note } = body;
    if (!workspace_id || !status) return Response.json({ error: "workspace_id, status required" }, { status: 400 });
    const subscriptionStatus = status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";

    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
      { workspace_id, status: "ACTIVE" }, "-created_date", 50
    );
    const suspended = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
      { workspace_id, status: "SUSPENDED" }, "-created_date", 50
    );
    const allExisting = [...(existing || []), ...(suspended || [])];
    for (const s of allExisting) {
      await base44.asServiceRole.entities.WorkspaceSubscription.update(s.id, {
        status: subscriptionStatus,
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