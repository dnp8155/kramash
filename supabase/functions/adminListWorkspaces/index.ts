// adminListWorkspaces — Admin: list all workspaces with plan + usage.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { resolvePlanContext, countUsage } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const search = (body.search || "").toLowerCase();

    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: members } = await supabaseAdmin.from("workspace_members").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").order("created_at", { ascending: false }).limit(2000);

    const ownerByWs: Record<string, string> = {};
    for (const m of members || []) { if (m.role === "owner" && !ownerByWs[m.workspace_id]) ownerByWs[m.workspace_id] = m.user_id; }
    const userMap: Record<string, any> = {};
    for (const u of users || []) userMap[u.id] = u;
    const subByWs: Record<string, any> = {};
    for (const s of subs || []) { if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s; }

    const rows = [];
    for (const ws of workspaces || []) {
      const ownerId = ownerByWs[ws.id] || ws.owner_user_id;
      const owner = ownerId && userMap[ownerId];
      const sub = subByWs[ws.id];
      const ctx = await resolvePlanContext(ws.id);
      const usage = {
        events: await countUsage(ws.id, "max_events"),
        team_members: await countUsage(ws.id, "max_team_members"),
        services: await countUsage(ws.id, "max_services")
      };
      const ownerName = owner ? (owner.full_name || owner.email || "—") : "—";
      const ownerEmail = owner ? owner.email || "—" : "—";
      const haystack = `${ws.name} ${ownerName} ${ownerEmail}`.toLowerCase();
      if (search && !haystack.includes(search)) continue;
      rows.push({
        id: ws.id, name: ws.name, owner_name: ownerName, owner_email: ownerEmail,
        created_date: ws.created_at, plan_type: ctx.planCode.toLowerCase(),
        plan_status: ctx.planStatus, expires_at: ctx.expiresAt,
        subscription_status: sub ? sub.status : "ACTIVE", storage_gb: ctx.storageGb || 0, usage
      });
    }

    return Response.json({ workspaces: rows, total: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});