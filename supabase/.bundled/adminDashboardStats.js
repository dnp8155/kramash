// supabase/functions/_shared/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders
      });
    }
    const response = await handler(req);
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
var supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
async function getUserFromRequest(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// supabase/functions/adminDashboardStats/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*").order("created_at", { ascending: false }).limit(1e3);
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2e3);
    const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").order("created_at", { ascending: false }).limit(2e3);
    const { data: plans } = await supabaseAdmin.from("plans").select("*").order("sort_order", { ascending: true }).limit(50);
    const { data: payments } = await supabaseAdmin.from("subscription_payments").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: events } = await supabaseAdmin.from("events").select("*").order("created_at", { ascending: false }).limit(2e3);
    const planMap = {};
    for (const p of plans || []) planMap[p.id] = p.code;
    const now = /* @__PURE__ */ new Date();
    let freeCount = 0, proCount = 0, activePro = 0, expiredPro = 0, suspendedWs = 0;
    const subByWs = {};
    for (const s of subs || []) {
      if (s.status === "ACTIVE" && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
    }
    const wsOwnerMap = {};
    for (const ws of workspaces || []) {
      const sub = subByWs[ws.id];
      let planCode = "FREE", expiresAt = null;
      if (sub) {
        planCode = planMap[sub.plan_id] || "FREE";
        expiresAt = sub.expires_at;
      }
      const isExpired = expiresAt && /* @__PURE__ */ new Date(expiresAt + "T00:00:00") < now;
      if (planCode === "PRO") {
        proCount++;
        if (isExpired) expiredPro++;
        else activePro++;
      } else freeCount++;
      if (ws.plan_status === "suspended") suspendedWs++;
      wsOwnerMap[ws.id] = { planCode, isExpired, owner_id: ws.owner_user_id };
    }
    const successPayments = (payments || []).filter((p) => p.status === "SUCCESS");
    const totalRevenue = successPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const revenueMonths = [];
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
    const eventMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      eventMonths.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-IN", { month: "short" }), count: 0 });
    }
    for (const ev of events || []) {
      const sd = ev.start_date ? /* @__PURE__ */ new Date(ev.start_date + "T00:00:00") : null;
      if (!sd) continue;
      const key = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
      const m = eventMonths.find((x) => x.key === key);
      if (m) m.count++;
    }
    const arpu = activePro > 0 ? Math.round(totalRevenue / activePro) : 0;
    const months = [];
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
    const categoryDist = {};
    for (const ws of workspaces || []) {
      const cat = ws.business_category || "OTHER";
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
    }
    const ownerIdSet = new Set((workspaces || []).slice(0, 8).map((w) => w.owner_user_id));
    const ownerUsers = (users || []).filter((u) => ownerIdSet.has(u.id));
    const ownerEmailMap = {};
    for (const u of ownerUsers) ownerEmailMap[u.id] = u.email;
    const recentWorkspaces = (workspaces || []).slice(0, 8).map((ws) => ({
      id: ws.id,
      name: ws.name,
      business_category: ws.business_category || "OTHER",
      plan: wsOwnerMap[ws.id]?.planCode || "FREE",
      plan_status: ws.plan_status || "active",
      created_date: ws.created_at,
      owner_email: ownerEmailMap[ws.owner_user_id] || "\u2014"
    }));
    const recentPayments = successPayments.slice(0, 5).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency || "INR",
      status: p.status,
      gateway: p.gateway,
      created_date: p.created_at,
      workspace_id: p.workspace_id
    }));
    const conversionRate = (workspaces || []).length > 0 ? Math.round(proCount / (workspaces || []).length * 100) : 0;
    return Response.json({
      total_workspaces: (workspaces || []).length,
      free_workspaces: freeCount,
      pro_workspaces: proCount,
      active_pro: activePro,
      expired_pro: expiredPro,
      suspended_workspaces: suspendedWs,
      total_users: (users || []).length,
      total_revenue: totalRevenue,
      arpu,
      conversion_rate: conversionRate,
      monthly_growth: months,
      monthly_revenue: revenueMonths,
      monthly_active_events: eventMonths,
      category_distribution: categoryDist,
      recent_workspaces: recentWorkspaces,
      recent_payments: recentPayments
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
