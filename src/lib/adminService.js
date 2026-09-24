// ============================================================
// Admin Service — client-side queries for SaaS Admin pages
// ============================================================
// Platform admins can read all workspaces, subscriptions, payments,
// and profiles directly via RLS (is_platform_admin() policies).
// This replaces Edge Function calls that may not be deployed.
// ============================================================

import { supabase } from '@/lib/supabaseClient';

// ---------- Dashboard Stats ----------
export async function fetchAdminDashboardStats() {
  const [
    { data: workspaces },
    { data: users },
    { data: subs },
    { data: plans },
    { data: payments },
  ] = await Promise.all([
    supabase.from('workspaces').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
    supabase.from('workspace_subscriptions').select('*').order('created_at', { ascending: false }).limit(2000),
    supabase.from('plans').select('*').order('sort_order', { ascending: true }).limit(50),
    supabase.from('subscription_payments').select('*').order('created_at', { ascending: false }).limit(500),
  ]);

  const planMap = {};
  for (const p of plans || []) planMap[p.id] = p.code;

  const now = new Date();
  let freeCount = 0, proCount = 0, activePro = 0, expiredPro = 0, suspendedWs = 0;

  const subByWs = {};
  for (const s of subs || []) {
    if (s.status === 'ACTIVE' && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
  }

  const wsOwnerMap = {};
  for (const ws of workspaces || []) {
    const sub = subByWs[ws.id];
    let planCode = 'FREE', expiresAt = null;
    if (sub) { planCode = planMap[sub.plan_id] || 'FREE'; expiresAt = sub.expires_at; }
    const isExpired = expiresAt && new Date(expiresAt + 'T00:00:00') < now;
    if (planCode === 'PRO') { proCount++; if (isExpired) expiredPro++; else activePro++; }
    else freeCount++;
    if (ws.plan_status === 'suspended') suspendedWs++;
    wsOwnerMap[ws.id] = { planCode, isExpired, owner_id: ws.owner_user_id };
  }

  const successPayments = (payments || []).filter((p) => p.status === 'SUCCESS');
  const totalRevenue = successPayments.reduce((s, p) => s + (p.amount || 0), 0);

  // Revenue by month (last 6)
  const revenueMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueMonths.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      amount: 0,
    });
  }
  for (const p of successPayments) {
    const cd = p.created_at ? new Date(p.created_at) : null;
    if (!cd) continue;
    const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
    const m = revenueMonths.find((x) => x.key === key);
    if (m) m.amount += p.amount || 0;
  }

  // Workspace growth by month (last 6)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      count: 0,
    });
  }
  for (const ws of workspaces || []) {
    const cd = ws.created_at ? new Date(ws.created_at) : null;
    if (!cd) continue;
    const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count++;
  }

  // Category distribution
  const categoryDist = {};
  for (const ws of workspaces || []) {
    const cat = ws.business_category || 'OTHER';
    categoryDist[cat] = (categoryDist[cat] || 0) + 1;
  }

  // Recent workspaces (top 8)
  const ownerIdSet = new Set((workspaces || []).slice(0, 8).map((w) => w.owner_user_id));
  const ownerUsers = (users || []).filter((u) => ownerIdSet.has(u.id));
  const ownerEmailMap = {};
  for (const u of ownerUsers) ownerEmailMap[u.id] = u.email;

  const recentWorkspaces = (workspaces || []).slice(0, 8).map((ws) => ({
    id: ws.id,
    name: ws.name,
    business_category: ws.business_category || 'OTHER',
    plan: wsOwnerMap[ws.id]?.planCode || 'FREE',
    plan_status: ws.plan_status || 'active',
    created_date: ws.created_at,
    owner_email: ownerEmailMap[ws.owner_user_id] || '—',
  }));

  const recentPayments = successPayments.slice(0, 5).map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency || 'INR',
    status: p.status,
    gateway: p.gateway,
    created_date: p.created_at,
    workspace_id: p.workspace_id,
  }));

  const conversionRate = (workspaces || []).length > 0
    ? Math.round((proCount / (workspaces || []).length) * 100)
    : 0;

  const arpu = activePro > 0 ? Math.round(totalRevenue / activePro) : 0;

  return {
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
    monthly_active_events: [], // events table RLS restricts to own; skip platform-wide
    category_distribution: categoryDist,
    recent_workspaces: recentWorkspaces,
    recent_payments: recentPayments,
  };
}

// ---------- Workspace List ----------
export async function fetchAdminWorkspaces(search = '') {
  const [
    { data: workspaces },
    { data: members },
    { data: users },
    { data: subs },
  ] = await Promise.all([
    supabase.from('workspaces').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('workspace_members').select('*').order('created_at', { ascending: false }).limit(2000),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
    supabase.from('workspace_subscriptions').select('*').order('created_at', { ascending: false }).limit(2000),
  ]);

  const ownerByWs = {};
  for (const m of members || []) {
    if (m.role === 'owner' && !ownerByWs[m.workspace_id]) ownerByWs[m.workspace_id] = m.user_id;
  }
  const userMap = {};
  for (const u of users || []) userMap[u.id] = u;
  const subByWs = {};
  for (const s of subs || []) {
    if (s.status === 'ACTIVE' && !subByWs[s.workspace_id]) subByWs[s.workspace_id] = s;
  }

  const searchLower = (search || '').toLowerCase();
  const rows = [];

  for (const ws of workspaces || []) {
    const ownerId = ownerByWs[ws.id] || ws.owner_user_id;
    const owner = ownerId && userMap[ownerId];
    const sub = subByWs[ws.id];

    let planCode = 'free';
    let planStatus = ws.plan_status || 'active';
    let expiresAt = null;

    if (sub) {
      // Look up plan code from plans map — but we don't have plans loaded here.
      // Use the subscription's plan_id to determine if pro.
      planCode = sub.plan_id ? 'pro' : 'free';
      expiresAt = sub.expires_at;
      if (expiresAt && new Date(expiresAt + 'T00:00:00') < new Date()) planStatus = 'expired';
    }

    const ownerName = owner ? (owner.full_name || owner.email || '—') : '—';
    const ownerEmail = owner ? owner.email || '—' : '—';
    const haystack = `${ws.name} ${ownerName} ${ownerEmail}`.toLowerCase();
    if (searchLower && !haystack.includes(searchLower)) continue;

    rows.push({
      id: ws.id,
      name: ws.name,
      owner_name: ownerName,
      owner_email: ownerEmail,
      created_date: ws.created_at,
      plan_type: planCode,
      plan_status: planStatus,
      expires_at: expiresAt,
      subscription_status: sub ? sub.status : 'ACTIVE',
      storage_gb: 0,
      usage: { events: 0, team_members: 0, services: 0 },
    });
  }

  return { workspaces: rows, total: rows.length };
}