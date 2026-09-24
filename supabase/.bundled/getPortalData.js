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

// supabase/functions/_shared/helpers.ts
function safeJson(v) {
  if (v === null || v === void 0) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
function filterTeamItems(items) {
  return (items || []).filter((it) => it.item_type === "team");
}
function filterServiceItems(items) {
  return (items || []).filter((it) => it.item_type === "service");
}
function calculateMilestoneAmount(milestone, grandTotal) {
  const value = Math.max(0, Number(milestone?.value) || 0);
  if (milestone?.type === "fixed") return round2(value);
  return round2((Number(grandTotal) || 0) * value / 100);
}

// supabase/functions/getPortalData/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    const providedPassword = body.password || "";
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });
    const { data: list } = await supabaseAdmin.from("quotations").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    if (!list || list.length === 0) return Response.json({ error: "Project not found" }, { status: 404 });
    const q = list[0];
    if (!q.public_link_enabled) {
      return Response.json({ unavailable: true, message: "This project link is currently unavailable." });
    }
    if (q.client_access_password) {
      if (!providedPassword || providedPassword !== q.client_access_password) {
        return Response.json({ requires_password: true });
      }
    }
    if (!skipTracking) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const viewCount = (Number(q.portal_view_count) || 0) + 1;
      const firstViewed = q.portal_first_viewed_at || now;
      supabaseAdmin.from("quotations").update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).eq("id", q.id).then(() => {
      }, () => {
      });
    }
    let event = null, client = null, business = null, milestones = [];
    event = safeJson(q.event_snapshot);
    client = safeJson(q.client_snapshot);
    business = safeJson(q.business_snapshot);
    milestones = safeJson(q.payment_schedule_json) || [];
    const { data: items } = await supabaseAdmin.from("quotation_items").select("*").eq("quotation_id", q.id).order("sort_order", { ascending: true }).limit(500);
    let currency = "INR";
    const { data: ws } = await supabaseAdmin.from("workspaces").select("currency").eq("id", q.workspace_id).single();
    if (ws?.currency) currency = ws.currency;
    let totalReceived = 0;
    if (q.event_id) {
      const { data: txns } = await supabaseAdmin.from("financial_transactions").select("*").eq("event_id", q.event_id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: true }).limit(500);
      totalReceived = (txns || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }
    const grandTotal = Number(q.grand_total) || 0;
    let milestoneStates = [];
    if (q.event_id) {
      const { data: dbMilestones } = await supabaseAdmin.from("payment_milestones").select("*").eq("workspace_id", q.workspace_id).eq("event_id", q.event_id).order("sort_order", { ascending: true }).limit(100);
      if (dbMilestones && dbMilestones.length > 0) {
        milestoneStates = dbMilestones.map((m) => {
          const due = Number(m.due_amount) || 0;
          const paid = Number(m.paid_amount) || 0;
          return { name: m.name || "", amount: round2(due), due_date: m.due_date || "", paid: due > 0 && paid >= due, paid_amount: round2(paid), status: m.status || "upcoming" };
        });
      }
    }
    if (milestoneStates.length === 0 && milestones.length > 0) {
      let remaining = totalReceived;
      for (const m of milestones) {
        if (!m.name) continue;
        const amount = calculateMilestoneAmount(m, grandTotal);
        if (amount > 0 && remaining >= amount) {
          milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: true, paid_amount: amount, status: "paid" });
          remaining = round2(remaining - amount);
        } else {
          milestoneStates.push({ name: m.name, amount, due_date: m.due_date || "", paid: false, paid_amount: round2(Math.max(0, remaining)), status: remaining > 0 ? "partially_paid" : "upcoming" });
          remaining = 0;
        }
      }
    }
    const today = /* @__PURE__ */ new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const eventStart = event?.start_date || q.start_date ? /* @__PURE__ */ new Date((event?.start_date || q.start_date) + "T00:00:00") : null;
    const eventEnd = event?.end_date || q.end_date ? /* @__PURE__ */ new Date((event?.end_date || q.end_date) + "T00:00:00") : null;
    let currentStage = 0;
    if (q.status === "accepted") {
      if (eventEnd && today > eventEnd) currentStage = 4;
      else if (eventStart && today >= eventStart) currentStage = 3;
      else currentStage = 2;
    } else if (q.status === "finalized") {
      currentStage = 1;
    }
    const expired = q.valid_until && /* @__PURE__ */ new Date(q.valid_until + "T00:00:00") < today;
    const hideTeamNames = !!q.hide_team_names;
    const team = filterTeamItems(items).map((it) => ({
      role: it.name || "",
      name: hideTeamNames ? "" : it.team_member_name_snapshot || "",
      quantity: Math.max(1, Number(it.quantity) || 1),
      member_type: it.member_type || "",
      hide: hideTeamNames
    }));
    const services = filterServiceItems(items).map((it) => ({ name: it.name || "", description: it.description || "" }));
    let quotationCardState = "draft";
    if (q.status === "accepted") quotationCardState = "signed";
    else if (q.status === "finalized" && expired) quotationCardState = "expired";
    else if (q.status === "finalized") quotationCardState = "pending";
    return Response.json({
      project: {
        title: q.project_title || event?.title || "",
        category: q.category || "",
        context_type: q.context_type || "",
        event_date: event?.start_date || q.start_date || "",
        event_end_date: event?.end_date || q.end_date || "",
        event_dates: Array.isArray(event?.event_dates) && event.event_dates.length > 0 ? event.event_dates : [event?.start_date || q.start_date || ""].filter(Boolean),
        venue: event?.venue || "",
        venue_address: event?.venue_address || ""
      },
      quotation: {
        id: q.id,
        public_token: q.public_token || "",
        quotation_number: q.quotation_number,
        status: q.status,
        grand_total: grandTotal,
        valid_until: q.valid_until || "",
        expired: !!expired,
        card_state: quotationCardState,
        signed_at: q.signed_at || "",
        signed_by_name: q.signed_by_name || ""
      },
      timeline: { current_stage: currentStage, stages: [{ label: "Booking Confirmed", step: 1 }, { label: "Planning", step: 2 }, { label: "Event Day", step: 3 }, { label: "Delivery", step: 4 }] },
      milestones: milestoneStates,
      total_received: round2(totalReceived),
      team,
      services,
      currency,
      hide_team_names: hideTeamNames,
      business_name: business?.name || "",
      business_logo: business?.logo || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
