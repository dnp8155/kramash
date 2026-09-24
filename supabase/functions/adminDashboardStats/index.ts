import { withCors } from "../_shared/cors.ts";
// adminDashboardStats — Platform-level dashboard statistics (admin only).
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*").order("created_at", { ascending: false }).limit(1000);
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").order("created_at", { ascending: false }).limit(2000);
    const { data: plans } = await supabaseAdmin.from("plans").select("*").order("sort_order", { ascending: true }).limit(50);
    const { data: payments } = await supabaseAdmin.from("subscription_payments").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: events } = await supabaseAdmin.from("events").select("*").order("created_at", { ascending: false }).limit(2000);

    const planMap: Record<string, string> = {};
    for (const p of plans || []) planMap[p.id] = p.code;

    const now = new Date();
    let freeCount = 0, proCount = 0, activePro = 0, expiredPro = 0, suspendedWs = 0;

    const subByWs: Record<string, any> = {};
    for (const s of subs || []) { if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s; }

    const wsOwnerMap: Record<string, any> = {};
    for (const ws of workspaces || []) {
      const sub = subByWs[ws.id];
      let planCode = "FREE", expiresAt: string | null = null;
      if (sub) { planCode = planMap[sub.plan_id] || "FREE"; expiresAt = sub.expires_at; }
      const isExpired = expiresAt && new Date(expiresAt + "T00:00:00") < now;
      if (planCode === "PRO") { proCount++; if (isExpired) expiredPro++; else activePro++; }
      else freeCount++;
      if (ws.plan_status === "suspended") suspendedWs++;
      wsOwnerMap[ws.id] = { planCode, isExpired, owner_id: ws.owner_user_id };
    }

    const successPayments = (payments || []).filter((p) => p.status === "SUCCESS");
    const totalRevenue = successPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const revenueMonths: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueMonths.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-IN", { month: "short" }), amount: 0 });
    }
    for (const p of successPayments) {
      const cd = p.created_at ? new Date(p.created_at) : null;
      if (!cd) continue;
      const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}`;
      const m = revenueMonths.find((x) => x.key === key);
      if (m) m.amount += p.amount || 0;
    }

    const eventMonths: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      eventMonths.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-IN", { month: "short" }), count: 0 });
    }
    for (const ev of events || []) {
      const sd = ev.start_date ? new Date(ev.start_date + "T00:00:00") : null;
      if (!sd) continue;
      const key = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
      const m = eventMonths.find((x) => x.key === key);
      if (m) m.count++;
    }

    const arpu = activePro > 0 ? Math.round(totalRevenue / activePro) : 0;

    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-IN", { month: "short" }), count: 0 });
    }
    for (const ws of workspaces || []) {
      const cd = ws.created_at ? new Date(ws.created_at) : null;
      if (!cd) continue;
      const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    }

    const categoryDist: Record<string, number> = {};
    for (const ws of workspaces || []) {
      const cat = ws.business_category || "OTHER";
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
    }

    const ownerIdSet = new Set((workspaces || []).slice(0, 8).map((w) => w.owner_user_id));
    const ownerUsers = (users || []).filter((u) => ownerIdSet.has(u.id));
    const ownerEmailMap: Record<string, string> = {};
    for (const u of ownerUsers) ownerEmailMap[u.id] = u.email;

    const recentWorkspaces = (workspaces || []).slice(0, 8).map((ws) => ({
      id: ws.id, name: ws.name, business_category: ws.business_category || "OTHER",
      plan: wsOwnerMap[ws.id]?.planCode || "FREE", plan_status: ws.plan_status || "active",
      created_date: ws.created_at, owner_email: ownerEmailMap[ws.owner_user_id] || "—"
    }));

    const recentPayments = successPayments.slice(0, 5).map((p) => ({
      id: p.id, amount: p.amount, currency: p.currency || "INR", status: p.status,
      gateway: p.gateway, created_date: p.created_at, workspace_id: p.workspace_id
    }));

    const conversionRate = (workspaces || []).length > 0 ? Math.round((proCount / (workspaces || []).length) * 100) : 0;

    return Response.json({
      total_workspaces: (workspaces || []).length, free_workspaces: freeCount, pro_workspaces: proCount,
      active_pro: activePro, expired_pro: expiredPro, suspended_workspaces: suspendedWs,
      total_users: (users || []).length, total_revenue: totalRevenue, arpu, conversion_rate: conversionRate,
      monthly_growth: months, monthly_revenue: revenueMonths, monthly_active_events: eventMonths,
      category_distribution: categoryDist, recent_workspaces: recentWorkspaces, recent_payments: recentPayments
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));