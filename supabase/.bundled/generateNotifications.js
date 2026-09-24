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

// supabase/functions/_shared/planEngine.ts
var PLAN_CODES = { FREE: "FREE", PRO: "PRO" };
var SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };
var BOOLEAN_LIMIT_KEYS = /* @__PURE__ */ new Set([
  "pdf_export_enabled",
  "reminders_enabled",
  "notifications_enabled",
  "link_sharing_enabled",
  "client_portal_enabled",
  "team_portal_enabled",
  "excel_csv_export_enabled",
  "event_display_customization_enabled",
  "quotation_logo_enabled"
]);
var UNLIMITED = 999999;
function parseLimitValue(key, rawValue) {
  if (BOOLEAN_LIMIT_KEYS.has(key)) return String(rawValue) === "true";
  const n = parseInt(String(rawValue), 10);
  return isNaN(n) ? UNLIMITED : n;
}
async function resolvePlanContext(workspaceId) {
  const { data: subs } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
  const activeSub = subs && subs.find((s) => s.status === SUB_STATUS.ACTIVE) || subs && subs[0] || null;
  let planCode = PLAN_CODES.FREE;
  let planStatus = "free";
  let isExpired = false;
  let expiresAt = null;
  let subscription = activeSub;
  if (activeSub) {
    if (activeSub.plan_id) {
      const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", activeSub.plan_id).single();
      if (plan) planCode = plan.code;
    }
    if (activeSub.expires_at) {
      const exp = /* @__PURE__ */ new Date(activeSub.expires_at + "T00:00:00");
      if (exp < /* @__PURE__ */ new Date() && activeSub.status === SUB_STATUS.ACTIVE) isExpired = true;
    }
    if (isExpired) {
      planCode = PLAN_CODES.FREE;
      planStatus = "expired";
    } else {
      planStatus = (activeSub.status || "active").toLowerCase();
    }
    expiresAt = activeSub.expires_at || null;
  }
  const { data: plans } = await supabaseAdmin.from("plans").select("*").eq("code", planCode);
  const planRecord = plans && plans[0] || null;
  let limits = {};
  if (planRecord) {
    const { data: planLimits } = await supabaseAdmin.from("plan_limits").select("*").eq("plan_id", planRecord.id).eq("enabled", true);
    for (const pl of planLimits || []) {
      limits[pl.limit_key] = parseLimitValue(pl.limit_key, pl.limit_value);
    }
  }
  let storageGb = limits.max_storage_gb || 0;
  if (activeSub && activeSub.pricing_id && !isExpired) {
    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", activeSub.pricing_id).single();
    if (pricing && typeof pricing.storage_gb === "number") storageGb = pricing.storage_gb;
  }
  return { planCode, planStatus, isExpired, expiresAt, subscription, limits, planRecord, storageGb };
}

// supabase/functions/_shared/helpers.ts
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function parseISODate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function formatDatesList(datesArray) {
  if (!Array.isArray(datesArray) || datesArray.length === 0) return "\u2014";
  const parsed = datesArray.map(parseISODate).filter((d) => d !== null).sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return "\u2014";
  const first = parsed[0];
  const sameYear = parsed.every((d) => d.getFullYear() === first.getFullYear());
  const groups = [];
  for (const d of parsed) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(d.getDate());
    } else {
      groups.push({ key, year: d.getFullYear(), month: d.getMonth(), days: [d.getDate()] });
    }
  }
  const parts = groups.map((g) => {
    const daysStr = g.days.join(", ");
    const monthYear = sameYear ? MONTHS[g.month] : `${MONTHS[g.month]} ${g.year}`;
    return `${daysStr} ${monthYear}`;
  });
  return parts.join(", ") + (sameYear ? ` ${first.getFullYear()}` : "");
}

// supabase/functions/generateNotifications/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const workspaceId = body?.workspace_id;
    if (!workspaceId) return Response.json({ error: "No active workspace" }, { status: 400 });
    let created = 0, skipped = 0;
    const now = /* @__PURE__ */ new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const { data: members } = await supabaseAdmin.from("workspace_members").select("*").eq("workspace_id", workspaceId).eq("status", "active");
    if (!members || members.length === 0) return Response.json({ ok: true, created: 0, skipped: 0 });
    const isMember = (members || []).some((m) => m.user_id === user.id);
    if (!isMember) return Response.json({ error: "Access denied: not a member of this workspace" }, { status: 403 });
    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).single();
    const category = workspace?.business_category || "OTHER";
    const isProjectCategory = category === "ARCHITECTURE" || category === "OTHER";
    const workSingular = workspace?.custom_work_label_singular?.trim() || (isProjectCategory ? "Project" : "Event");
    const reminderTomorrow = isProjectCategory ? `${workSingular} starts tomorrow` : `${workSingular} tomorrow`;
    const reminderComing = isProjectCategory ? `${workSingular} coming up` : `${workSingular} coming up`;
    const reminderVerb = isProjectCategory ? "starts on" : "is scheduled for";
    const { data: existingNotifs } = await supabaseAdmin.from("notifications").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100);
    const existingKeys = new Set((existingNotifs || []).map((n) => `${n.user_id}:${n.type}:${n.related_entity_id}`));
    const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", workspaceId).eq("status", "upcoming").order("start_date", { ascending: true }).limit(200);
    const memberEmails = {};
    const memberNames = {};
    for (const m of members || []) {
      const { data: u } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", m.user_id).single();
      if (u?.email) memberEmails[m.user_id] = u.email;
      if (u?.full_name) memberNames[m.user_id] = u.full_name;
    }
    for (const ev of events || []) {
      const evDates = ev.event_dates && ev.event_dates.length > 0 ? ev.event_dates : ev.start_date ? [ev.start_date] : [];
      if (evDates.length === 0) continue;
      const firstDate = evDates.slice().sort()[0];
      if (firstDate >= todayISO && firstDate <= in48h) {
        for (const m of members || []) {
          const key = `${m.user_id}:event_reminder:${ev.id}`;
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          const is24 = firstDate <= in24h;
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId,
            user_id: m.user_id,
            type: "event_reminder",
            title: is24 ? reminderTomorrow : reminderComing,
            message: `"${ev.title}" ${reminderVerb} ${formatDatesList(evDates)}${ev.venue ? ` at ${ev.venue}` : ""}.`,
            related_entity_type: "event",
            related_entity_id: ev.id,
            read: false
          });
          existingKeys.add(key);
          created++;
        }
      }
    }
    const planCtx = await resolvePlanContext(workspaceId);
    if (planCtx.subscription && planCtx.subscription.status === "ACTIVE" && planCtx.expiresAt) {
      const expiry = planCtx.expiresAt;
      if (planCtx.isExpired) {
        for (const m of members || []) {
          const key = `${m.user_id}:subscription_expired:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId,
            user_id: m.user_id,
            type: "subscription_expired",
            title: "Pro plan expired",
            message: `Your Kramasha Pro plan expired on ${formatDatesList([expiry])}. Free plan limits now apply. Renew to restore Pro features.`,
            related_entity_type: "subscription",
            related_entity_id: planCtx.subscription.id,
            read: false
          });
          existingKeys.add(key);
          created++;
        }
      } else if (expiry <= in7days) {
        for (const m of members || []) {
          const key = `${m.user_id}:subscription_expiring:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          const daysLeft = Math.ceil(((/* @__PURE__ */ new Date(expiry + "T00:00:00")).getTime() - now.getTime()) / (24 * 60 * 60 * 1e3));
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId,
            user_id: m.user_id,
            type: "subscription_expiring",
            title: "Pro plan expiring soon",
            message: `Your Kramasha Pro plan expires in ${daysLeft} day(s) (${formatDatesList([expiry])}). Renew before expiry to keep Pro features.`,
            related_entity_type: "subscription",
            related_entity_id: planCtx.subscription.id,
            read: false
          });
          existingKeys.add(key);
          created++;
        }
      }
    }
    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
