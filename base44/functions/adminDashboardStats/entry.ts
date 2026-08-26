import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const [workspaces, users, subs, plans, payments, events] = await Promise.all([
      base44.asServiceRole.entities.Workspace.list("-created_date", 1000),
      base44.asServiceRole.entities.User.list("-created_date", 2000),
      base44.asServiceRole.entities.WorkspaceSubscription.list("-created_date", 2000),
      base44.asServiceRole.entities.Plan.list("sort_order", 50),
      base44.asServiceRole.entities.SubscriptionPayment.list("-created_date", 500),
      base44.asServiceRole.entities.Event.list("-created_date", 2000),
    ]);

    const planMap = {};
    for (const p of plans) { planMap[p.id] = p.code; }

    const now = new Date();
    let freeCount = 0;
    let proCount = 0;
    let activePro = 0;
    let expiredPro = 0;
    let suspendedWs = 0;

    const subByWs = {};
    for (const s of subs) {
      if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
    }

    const wsOwnerMap = {};
    for (const ws of workspaces) {
      const sub = subByWs[ws.id];
      let planCode = "FREE";
      let subStatus = "none";
      let expiresAt = null;
      if (sub) {
        planCode = planMap[sub.plan_id] || "FREE";
        subStatus = sub.status;
        expiresAt = sub.expires_at;
      }
      const isExpired = expiresAt && new Date(expiresAt + "T00:00:00") < now;
      if (planCode === "PRO") {
        proCount++;
        if (isExpired) expiredPro++;
        else activePro++;
      } else {
        freeCount++;
      }
      if (ws.plan_status === "suspended") suspendedWs++;
      wsOwnerMap[ws.id] = { planCode, subStatus, isExpired, owner_id: ws.owner_user_id };
    }

    // Revenue: sum of SUCCESS payments
    const successPayments = (payments || []).filter((p) => p.status === "SUCCESS");
    const totalRevenue = successPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // Monthly revenue — last 6 months
    const revenueMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueMonths.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-IN", { month: "short" }),
        amount: 0,
      });
    }
    for (const p of successPayments) {
      const cd = p.created_date ? new Date(p.created_date) : null;
      if (!cd) continue;
      const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}`;
      const m = revenueMonths.find((x) => x.key === key);
      if (m) m.amount += p.amount || 0;
    }

    // Monthly active events — events per month (by start_date) for last 6 months
    const eventMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      eventMonths.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-IN", { month: "short" }),
        count: 0,
      });
    }
    for (const ev of (events || [])) {
      const sd = ev.start_date ? new Date(ev.start_date + "T00:00:00") : null;
      if (!sd) continue;
      const key = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
      const m = eventMonths.find((x) => x.key === key);
      if (m) m.count++;
    }

    // Avg revenue per pro workspace
    const arpu = activePro > 0 ? Math.round(totalRevenue / activePro) : 0;

    // Monthly growth — workspaces created per month for last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-IN", { month: "short" }),
        count: 0,
      });
    }
    for (const ws of workspaces) {
      const cd = ws.created_date ? new Date(ws.created_date) : null;
      if (!cd) continue;
      const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    }

    // Category distribution
    const categoryDist = {};
    for (const ws of workspaces) {
      const cat = ws.business_category || "OTHER";
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
    }

    // Recent workspaces (latest 8) with owner email
    const ownerIdSet = new Set(workspaces.slice(0, 8).map((w) => w.owner_user_id));
    const ownerUsers = ownerIdSet.size
      ? (users || []).filter((u) => ownerIdSet.has(u.id))
      : [];
    const ownerEmailMap = {};
    for (const u of ownerUsers) ownerEmailMap[u.id] = u.email;

    const recentWorkspaces = workspaces.slice(0, 8).map((ws) => ({
      id: ws.id,
      name: ws.name,
      business_category: ws.business_category || "OTHER",
      plan: wsOwnerMap[ws.id]?.planCode || "FREE",
      plan_status: ws.plan_status || "active",
      created_date: ws.created_date,
      owner_email: ownerEmailMap[ws.owner_user_id] || "—",
    }));

    // Recent successful payments (latest 5)
    const recentPayments = successPayments.slice(0, 5).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency || "INR",
      status: p.status,
      gateway: p.gateway,
      created_date: p.created_date,
      workspace_id: p.workspace_id,
    }));

    const conversionRate = workspaces.length > 0
      ? Math.round((proCount / workspaces.length) * 100)
      : 0;

    return Response.json({
      total_workspaces: workspaces.length,
      free_workspaces: freeCount,
      pro_workspaces: proCount,
      active_pro: activePro,
      expired_pro: expiredPro,
      suspended_workspaces: suspendedWs,
      total_users: users.length,
      total_revenue: totalRevenue,
      arpu: arpu,
      conversion_rate: conversionRate,
      monthly_growth: months,
      monthly_revenue: revenueMonths,
      monthly_active_events: eventMonths,
      category_distribution: categoryDist,
      recent_workspaces: recentWorkspaces,
      recent_payments: recentPayments,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}