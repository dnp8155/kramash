import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const workspaces = await base44.asServiceRole.entities.Workspace.list("-created_date", 1000);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const subs = await base44.asServiceRole.entities.WorkspaceSubscription.list("-created_date", 2000);

    const now = new Date();
    let freeCount = 0;
    let proCount = 0;
    let activePro = 0;
    let expiredPro = 0;

    const subByWs = {};
    for (const s of subs) {
      if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
    }

    for (const ws of workspaces) {
      const sub = subByWs[ws.id];
      if (!sub) {
        freeCount++;
        continue;
      }
      // Determine plan code via plan_id
      let planCode = "FREE";
      if (sub.plan_id) {
        try {
          const plan = await base44.asServiceRole.entities.Plan.get(sub.plan_id);
          if (plan) planCode = plan.code;
        } catch (e) { /* ignore */ }
      }
      const isExpired = sub.expires_at && new Date(sub.expires_at + "T00:00:00") < now;
      if (planCode === "PRO") {
        proCount++;
        if (isExpired) expiredPro++;
        else activePro++;
      } else {
        freeCount++;
      }
    }

    return Response.json({
      total_workspaces: workspaces.length,
      free_workspaces: freeCount,
      pro_workspaces: proCount,
      active_pro: activePro,
      expired_pro: expiredPro,
      total_users: users.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}