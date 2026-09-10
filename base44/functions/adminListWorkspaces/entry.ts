import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { resolvePlanContext, countUsage } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const search = (body.search || "").toLowerCase();

    const workspaces = await base44.asServiceRole.entities.Workspace.list("-created_date", 500);
    const members = await base44.asServiceRole.entities.WorkspaceMember.list("-created_date", 2000);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const subs = await base44.asServiceRole.entities.WorkspaceSubscription.list("-created_date", 2000);

    const ownerByWs = {};
    for (const m of members) {
      if (m.role === "owner" && !ownerByWs[m.workspace_id]) ownerByWs[m.workspace_id] = m.user_id;
    }
    const userMap = {};
    for (const u of users) userMap[u.id] = u;
    const subByWs = {};
    for (const s of subs) {
      if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
    }

    const rows = [];
    for (const ws of workspaces) {
      const ownerId = ownerByWs[ws.id] || ws.owner_user_id;
      const owner = ownerId && userMap[ownerId];
      const sub = subByWs[ws.id];
      const ctx = await resolvePlanContext(base44, ws.id);
      const usage = {
        events: await countUsage(base44, ws.id, "max_events"),
        team_members: await countUsage(base44, ws.id, "max_team_members"),
        services: await countUsage(base44, ws.id, "max_services")
      };
      const ownerName = owner ? (owner.full_name || owner.email || "—") : "—";
      const ownerEmail = owner ? owner.email || "—" : "—";
      const haystack = `${ws.name} ${ownerName} ${ownerEmail}`.toLowerCase();
      if (search && !haystack.includes(search)) continue;
      rows.push({
        id: ws.id,
        name: ws.name,
        owner_name: ownerName,
        owner_email: ownerEmail,
        created_date: ws.created_date,
        plan_type: ctx.planCode.toLowerCase(),
        plan_status: ctx.planStatus,
        expires_at: ctx.expiresAt,
        subscription_status: sub ? sub.status : "ACTIVE",
        storage_gb: ctx.storageGb || 0,
        usage
      });
    }

    return Response.json({ workspaces: rows, total: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}