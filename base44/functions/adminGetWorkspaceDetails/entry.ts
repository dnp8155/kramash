import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspace_id;
    if (!workspaceId) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const ws = await base44.asServiceRole.entities.Workspace.get(workspaceId);
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    const members = await base44.asServiceRole.entities.WorkspaceMember.filter({ workspace_id: workspaceId }, "-created_date", 500);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 2000);
    const userMap = {};
    for (const u of users || []) userMap[u.id] = u;

    const ownerMember = (members || []).find((m) => m.role === "owner") || (members || [])[0];
    const owner = ownerMember && userMap[ownerMember.user_id];

    const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter({ workspace_id: workspaceId }, "-created_date", 50);

    // Count usage
    const events = await base44.asServiceRole.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1);
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ workspace_id: workspaceId }, "-created_date", 1);
    const services = await base44.asServiceRole.entities.Service.filter({ workspace_id: workspaceId }, "-created_date", 1);

    // Resolve plan context
    const activeSub = (subs || []).find((s) => s.status === "ACTIVE") || (subs || [])[0] || null;
    let planCode = "FREE";
    let planStatus = "free";
    let isExpired = false;
    let expiresAt = null;
    let storageGb = 0;
    let limits = {};

    if (activeSub) {
      try {
        const plan = await base44.asServiceRole.entities.Plan.get(activeSub.plan_id);
        if (plan) planCode = plan.code || "FREE";
      } catch {}
      planStatus = activeSub.status || "free";
      expiresAt = activeSub.expires_at || null;
      isExpired = expiresAt && expiresAt < new Date().toISOString().slice(0, 10);

      try {
        const planLimits = await base44.asServiceRole.entities.PlanLimit.filter({ plan_id: activeSub.plan_id }, "-created_date", 100);
        for (const pl of planLimits || []) {
          const key = pl.limit_key;
          if (pl.enabled) {
            if (["pdf_export_enabled", "reminders_enabled"].includes(key)) {
              limits[key] = pl.limit_value === "true";
            } else {
              limits[key] = parseInt(pl.limit_value, 10) || 999999;
            }
          }
        }
      } catch {}
    }

    return Response.json({
      workspace: {
        id: ws.id, name: ws.name, business_type: ws.business_type, email: ws.email,
        phone: ws.phone, city: ws.city, state: ws.state, country: ws.country,
        created_date: ws.created_date, currency: ws.currency, gst_enabled: ws.gst_enabled,
        owner_name: owner ? owner.full_name || owner.email || "—" : "—",
        owner_email: owner ? owner.email || "—" : "—"
      },
      plan: {
        plan_code: planCode, plan_status: planStatus, expires_at: expiresAt,
        is_expired: isExpired, storage_gb: storageGb, limits
      },
      usage: {
        events: events?.length || 0,
        team_members: teamMembers?.length || 0,
        services: services?.length || 0
      },
      subscriptions: (subs || []).map((s) => ({
        id: s.id, status: s.status, started_at: s.started_at, expires_at: s.expires_at,
        source: s.source, billing_cycle_snapshot: s.billing_cycle_snapshot,
        assigned_price: s.assigned_price, note: s.note, created_date: s.created_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}