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
    { data: workspacesRaw },
    { data: usersRaw },
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

  let workspaces = workspacesRaw;
  let users = usersRaw;
  // Leave out users deleted in Supabase Auth (and their workspaces). Needs migration 0041; without it nothing is hidden.
  const { data: liveIds, error: liveErr } = await supabase.rpc('admin_live_user_ids');
  if (!liveErr && Array.isArray(liveIds)) {
    const live = new Set(liveIds.map((x) => (typeof x === 'object' ? Object.values(x)[0] : x)));
    workspaces = (workspaces || []).filter((w) => live.has(w.owner_user_id));
    users = (users || []).filter((u) => live.has(u.id));
  }

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
// Storage as a short human string: 0 B, 12 MB, 1.4 GB.
export function formatStorage(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 GB';
  const gb = n / 1073741824;
  if (gb >= 0.1) return `${gb >= 10 ? Math.round(gb) : Math.round(gb * 100) / 100} GB`;
  const mb = n / 1048576;
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

// Workspaces whose owner still exists, with real usage. The list comes from the admin_workspace_overview() database
// function (migration 0041), which also drops workspaces of users deleted in Supabase Auth.
export async function fetchAdminWorkspaces(search = '') {
  const { data, error } = await supabase.rpc('admin_workspace_overview');
  if (error) {
    throw new Error(/admin_workspace_overview/i.test(error.message || '')
      ? 'The workspace list needs the 0041 database update (admin_workspace_overview). Ask your developer to run it.'
      : error.message);
  }

  const searchLower = (search || '').toLowerCase();
  const rows = [];
  for (const r of data || []) {
    const ownerName = r.owner_name || '—';
    const ownerEmail = r.owner_email || '—';
    if (searchLower && !`${r.name} ${ownerName} ${ownerEmail}`.toLowerCase().includes(searchLower)) continue;
    rows.push({
      id: r.id,
      name: r.name,
      owner_name: ownerName,
      owner_email: ownerEmail,
      created_date: r.created_at,
      plan_type: r.plan_code,
      plan_status: r.plan_status,
      expires_at: r.expires_at,
      subscription_status: r.subscription_status,
      storage_used_bytes: Number(r.storage_used_bytes) || 0,
      storage_allowance_gb: Number(r.storage_allowance_gb) || 0,
      usage: { events: Number(r.events_count) || 0, team_members: Number(r.team_members_count) || 0, services: Number(r.services_count) || 0 },
    });
  }
  return { workspaces: rows, total: rows.length };
}

// ---------- Support tickets ----------
// Bug reports, feature requests and feedback sent from Help & Support. Platform admins can read all of them
// (RLS: st_read) and answer them (st_update).
export async function fetchAdminTickets() {
  const { data: tickets, error } = await supabase
    .from('support_tickets').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const ids = [...new Set((tickets || []).map((t) => t.workspace_id).filter(Boolean))];
  let names = {};
  if (ids.length) {
    const { data: ws } = await supabase.from('workspaces').select('id, name').in('id', ids);
    names = Object.fromEntries((ws || []).map((w) => [w.id, w.name]));
  }
  return (tickets || []).map((t) => ({ ...t, workspace_name: names[t.workspace_id] || '' }));
}

// Saves the status / reply and tells the user (an in-app notification) when something they can see changed.
export async function updateAdminTicket(ticket, { status, admin_response }) {
  const reply = (admin_response ?? '').trim();
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, admin_response: reply || null })
    .eq('id', ticket.id);
  if (error) throw new Error(error.message);

  const replyChanged = reply && reply !== (ticket.admin_response || '').trim();
  const statusChanged = status !== ticket.status;
  if (replyChanged || statusChanged) {
    const statusText = { open: 'reopened', in_progress: 'being worked on', resolved: 'resolved', closed: 'closed' }[status] || status;
    await supabase.from('notifications').insert({
      workspace_id: ticket.workspace_id,
      user_id: ticket.user_id,
      type: 'general',
      title: replyChanged ? 'We replied to your support ticket' : `Your support ticket is ${statusText}`,
      message: replyChanged ? reply.slice(0, 200) : `“${ticket.subject}” is ${statusText}.`,
      related_entity_type: 'support_ticket',
      related_entity_id: String(ticket.id),
    }).then(() => {}, () => {}); // the reply itself is saved; a missed notification is not worth failing the save
  }
}

// Permanently delete a workspace and cascade purge all data & auth user from Supabase
export async function deleteAdminWorkspaceAndUser(workspaceId, purgeOwnerUser = true) {
  const { data, error } = await supabase.functions.invoke("adminDeleteUserOrWorkspace", {
    body: { workspace_id: workspaceId, purge_owner_user: purgeOwnerUser },
  });
  if (error) throw new Error(error.message || "Failed to delete workspace");
  if (data?.error) throw new Error(data.error);
  return data;
}
