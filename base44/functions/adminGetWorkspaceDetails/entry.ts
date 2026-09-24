// adminGetWorkspaceDetails — Admin: detailed workspace info + plan + usage.
// Ported from supabase/functions/adminGetWorkspaceDetails — uses Supabase admin client.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { resolvePlanContext, countUsage } from "../../shared/planEngine.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspace_id;
    if (!workspaceId) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const { data: ws } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).single();
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    const { data: members } = await supabaseAdmin.from("workspace_members").select("*").eq("workspace_id", workspaceId);
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    const userMap = {};
    for (const u of users || []) userMap[u.id] = u;

    const ownerMember = (members || []).find((m) => m.role === "owner") || (members || [])[0];
    const owner = ownerMember && userMap[ownerMember.user_id];

    const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
    const ctx = await resolvePlanContext(workspaceId);
    const usage = {
      events: await countUsage(workspaceId, "max_events"),
      team_members: await countUsage(workspaceId, "max_team_members"),
      services: await countUsage(workspaceId, "max_services")
    };

    return Response.json({
      workspace: {
        id: ws.id, name: ws.name, business_type: ws.business_type, email: ws.email,
        phone: ws.phone, city: ws.city, state: ws.state, country: ws.country,
        created_date: ws.created_at, currency: ws.currency, gst_enabled: ws.gst_enabled,
        owner_name: owner ? owner.full_name || owner.email || "—" : "—",
        owner_email: owner ? owner.email || "—" : "—"
      },
      plan: {
        plan_code: ctx.planCode, plan_status: ctx.planStatus, expires_at: ctx.expiresAt,
        is_expired: ctx.isExpired, storage_gb: ctx.storageGb || 0, limits: ctx.limits
      },
      usage,
      subscriptions: (subs || []).map((s) => ({
        id: s.id, status: s.status, started_at: s.started_at, expires_at: s.expires_at,
        source: s.source, billing_cycle_snapshot: s.billing_cycle_snapshot,
        assigned_price: s.assigned_price, note: s.note, created_date: s.created_at
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}