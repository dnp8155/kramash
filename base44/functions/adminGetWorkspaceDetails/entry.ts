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
    const workspaceId = body.workspace_id;
    if (!workspaceId) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const ws = await base44.asServiceRole.entities.Workspace.get(workspaceId);
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    const members = await base44.asServiceRole.entities.WorkspaceMember.filter({ workspace_id: workspaceId });
    const users = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const userMap = {};
    for (const u of users) userMap[u.id] = u;

    const ownerMember = members.find((m) => m.role === "owner") || members[0];
    const owner = ownerMember && userMap[ownerMember.user_id];

    const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
      { workspace_id: workspaceId },
      "-created_date",
      50
    );
    const ctx = await resolvePlanContext(base44, workspaceId);
    const usage = {
      events: await countUsage(base44, workspaceId, "max_events"),
      team_members: await countUsage(base44, workspaceId, "max_team_members"),
      services: await countUsage(base44, workspaceId, "max_services")
    };

    return Response.json({
      workspace: {
        id: ws.id,
        name: ws.name,
        business_type: ws.business_type,
        email: ws.email,
        phone: ws.phone,
        city: ws.city,
        state: ws.state,
        country: ws.country,
        created_date: ws.created_date,
        currency: ws.currency,
        gst_enabled: ws.gst_enabled,
        owner_name: owner ? owner.full_name || owner.email || "—" : "—",
        owner_email: owner ? owner.email || "—" : "—"
      },
      plan: {
        plan_code: ctx.planCode,
        plan_status: ctx.planStatus,
        expires_at: ctx.expiresAt,
        is_expired: ctx.isExpired,
        storage_gb: ctx.storageGb || 0,
        limits: ctx.limits
      },
      usage,
      subscriptions: subs.map((s) => ({
        id: s.id,
        status: s.status,
        started_at: s.started_at,
        expires_at: s.expires_at,
        source: s.source,
        billing_cycle_snapshot: s.billing_cycle_snapshot,
        assigned_price: s.assigned_price,
        note: s.note,
        created_date: s.created_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}