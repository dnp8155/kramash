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
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
}

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
function groupBy(arr, key) {
  const groups = {};
  for (const item of arr || []) {
    const k = item[key];
    if (!k) continue;
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}
function sumLineTotals(items) {
  return round2((items || []).reduce((s, it) => s + (Number(it.line_total) || 0), 0));
}
function uniqueSortedDates(dates) {
  return [...new Set(dates)].filter(Boolean).sort();
}
function deriveEventDates(quotation) {
  if (!quotation.start_date) return [];
  const excluded = new Set(quotation.excluded_dates || []);
  const start = /* @__PURE__ */ new Date(quotation.start_date + "T00:00:00");
  const end = quotation.end_date ? /* @__PURE__ */ new Date(quotation.end_date + "T00:00:00") : /* @__PURE__ */ new Date(quotation.start_date + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [quotation.start_date].filter(Boolean);
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    if (!excluded.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// supabase/functions/syncQuotationAcceptance/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { workspace_id, quotation_id } = body;
    if (!workspace_id || !quotation_id) {
      return Response.json({ error: "workspace_id and quotation_id are required" }, { status: 400 });
    }
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });
    const { data: quotation } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!quotation || quotation.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace" }, { status: 404 });
    }
    if (quotation.status !== "accepted") {
      return Response.json({ error: "Quotation must be accepted before syncing" }, { status: 400 });
    }
    const { data: items } = await supabaseAdmin.from("quotation_items").select("*").eq("workspace_id", workspace_id).eq("quotation_id", quotation_id).order("sort_order", { ascending: true }).limit(500);
    let clientSnapshot = null, eventSnapshot = null;
    clientSnapshot = safeJson(quotation.client_snapshot) || {};
    eventSnapshot = safeJson(quotation.event_snapshot) || {};
    let event = null, eventCreated = false;
    if (quotation.event_id) {
      const { data: e } = await supabaseAdmin.from("events").select("*").eq("id", quotation.event_id).single();
      if (e && e.workspace_id === workspace_id) event = e;
    }
    const eventDates = deriveEventDates(quotation);
    const eventPayload = {
      client_id: quotation.client_id || "",
      title: clientSnapshot?.name ? `${clientSnapshot.name} \u2014 ${quotation.project_title || eventSnapshot?.title || quotation.quotation_number}` : quotation.project_title || eventSnapshot?.title || quotation.quotation_number,
      event_type: eventSnapshot?.event_type || "",
      start_date: quotation.start_date || eventSnapshot?.start_date || quotation.quotation_date,
      end_date: quotation.end_date || eventSnapshot?.end_date || quotation.start_date || quotation.quotation_date,
      event_dates: eventDates,
      venue: eventSnapshot?.venue || "",
      venue_address: eventSnapshot?.venue_address || "",
      contract_value: Number(quotation.grand_total) || 0,
      status: "upcoming",
      description: quotation.project_summary || "",
      notes: `Auto-synced from quotation ${quotation.quotation_number}`
    };
    if (event) {
      const updateData = { ...eventPayload };
      if (event.status === "in-progress" || event.status === "completed") delete updateData.status;
      const { data: updated } = await supabaseAdmin.from("events").update(updateData).eq("id", event.id).select("*").single();
      event = updated;
    } else {
      const { data: created } = await supabaseAdmin.from("events").insert({ workspace_id, ...eventPayload }).select("*").single();
      event = created;
      eventCreated = true;
    }
    const teamItems = (items || []).filter((it) => it.item_type === "team" && it.team_member_id);
    const teamByMember = groupBy(teamItems, "team_member_id");
    const teamSynced = [];
    for (const [memberId, memberItems] of Object.entries(teamByMember)) {
      const first = memberItems[0];
      const agreedRate = sumLineTotals(memberItems);
      const workingDates = uniqueSortedDates(memberItems.map((it) => it.day_date).filter(Boolean));
      const rateType = first.rate_type || "Per Event";
      const { data: existing } = await supabaseAdmin.from("event_team_assignments").select("*").eq("workspace_id", workspace_id).eq("event_id", event.id).eq("team_member_id", memberId).eq("assignment_status", "assigned").limit(1);
      const assignmentData = {
        role_id: first.reference_id || "",
        role_name_snapshot: "",
        member_type_id: "",
        member_type_snapshot: first.member_type || "",
        agreed_rate: agreedRate,
        rate_type: rateType,
        working_dates: workingDates,
        booking_start_date: workingDates[0] || "",
        booking_end_date: workingDates[workingDates.length - 1] || workingDates[0] || "",
        notes: `Synced from quotation ${quotation.quotation_number}`
      };
      if (existing && existing.length > 0) {
        const { data: updated } = await supabaseAdmin.from("event_team_assignments").update(assignmentData).eq("id", existing[0].id).select("*").single();
        teamSynced.push({ member_id: memberId, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("event_team_assignments").insert({ workspace_id, event_id: event.id, team_member_id: memberId, assignment_status: "assigned", ...assignmentData }).select("*").single();
        teamSynced.push({ member_id: memberId, action: "created", id: created.id });
      }
    }
    const teamMemberIds = Object.keys(teamByMember);
    await supabaseAdmin.from("events").update({ team_member_ids: teamMemberIds }).eq("id", event.id);
    const serviceItems = (items || []).filter((it) => it.item_type === "service" && it.reference_id);
    const serviceByRef = groupBy(serviceItems, "reference_id");
    const serviceSynced = [];
    for (const [serviceId, svcItems] of Object.entries(serviceByRef)) {
      const first = svcItems[0];
      const agreedRate = sumLineTotals(svcItems);
      const isAddon = svcItems.some((it) => it.is_addon);
      const { data: existing } = await supabaseAdmin.from("event_service_assignments").select("*").eq("workspace_id", workspace_id).eq("event_id", event.id).eq("service_id", serviceId).eq("assignment_status", "assigned").limit(1);
      const assignmentData = {
        service_name_snapshot: first.name || "",
        provider_id: "",
        provider_name_snapshot: "",
        agreed_rate: agreedRate,
        rate_type: first.rate_type || "Fixed",
        is_addon: isAddon,
        notes: `Synced from quotation ${quotation.quotation_number}`
      };
      if (existing && existing.length > 0) {
        const { data: updated } = await supabaseAdmin.from("event_service_assignments").update(assignmentData).eq("id", existing[0].id).select("*").single();
        serviceSynced.push({ service_id: serviceId, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("event_service_assignments").insert({ workspace_id, event_id: event.id, service_id: serviceId, assignment_status: "assigned", ...assignmentData }).select("*").single();
        serviceSynced.push({ service_id: serviceId, action: "created", id: created.id });
      }
    }
    const serviceIds = Object.keys(serviceByRef);
    await supabaseAdmin.from("events").update({ service_ids: serviceIds }).eq("id", event.id);
    const eventDate = event.start_date || quotation.quotation_date;
    let financialYearId = "", fyLabel = "";
    const { data: fys } = await supabaseAdmin.from("financial_years").select("*").eq("workspace_id", workspace_id).order("start_date", { ascending: false }).limit(100);
    const fy = (fys || []).find((f) => eventDate >= f.start_date && eventDate <= f.end_date);
    if (fy) {
      financialYearId = fy.id;
      fyLabel = fy.fy_id.replace(/^FY\s*/, "").trim();
    }
    if (fyLabel) await supabaseAdmin.from("events").update({ financial_year: fyLabel }).eq("id", event.id);
    let milestones = [];
    milestones = safeJson(quotation.payment_schedule_json) || [];
    const grandTotal = Number(quotation.grand_total) || 0;
    const milestonesSynced = [];
    const { data: existingMilestones } = await supabaseAdmin.from("payment_milestones").select("*").eq("workspace_id", workspace_id).eq("quotation_id", quotation_id).order("sort_order", { ascending: true }).limit(100);
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.name || !m.name.trim()) continue;
      const value = Math.max(0, Number(m.value) || 0);
      const dueAmount = m.type === "fixed" ? round2(value) : round2(grandTotal * value / 100);
      let calculatedDueDate = m.due_date || "";
      const dtype = m.due_date_type || "";
      if (dtype === "on_signing") calculatedDueDate = quotation.quotation_date || "";
      else if (dtype === "event_day") calculatedDueDate = event.start_date || quotation.start_date || "";
      else if (dtype === "day_after_event") {
        const endDate = event.end_date || event.start_date || quotation.end_date || quotation.start_date || "";
        if (endDate) {
          const d = /* @__PURE__ */ new Date(endDate + "T00:00:00");
          d.setDate(d.getDate() + 1);
          calculatedDueDate = d.toISOString().slice(0, 10);
        }
      }
      const existing = (existingMilestones || []).find((em) => em.name === m.name && em.quotation_id === quotation_id);
      const milestoneData = {
        event_id: event.id,
        client_id: quotation.client_id || "",
        name: m.name.trim(),
        description: m.due_condition || "",
        sort_order: i,
        milestone_type: m.type || "percent",
        milestone_value: value,
        due_amount: dueAmount,
        due_condition: m.due_condition || "",
        due_date: calculatedDueDate,
        financial_year_id: financialYearId
      };
      if (existing) {
        const { data: updated } = await supabaseAdmin.from("payment_milestones").update({ ...milestoneData, paid_amount: Number(existing.paid_amount) || 0 }).eq("id", existing.id).select("*").single();
        milestonesSynced.push({ name: m.name, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("payment_milestones").insert({ workspace_id, quotation_id, paid_amount: 0, status: "upcoming", ...milestoneData }).select("*").single();
        milestonesSynced.push({ name: m.name, action: "created", id: created.id });
      }
    }
    await supabaseAdmin.from("quotations").update({
      event_id: event.id,
      sync_pending: false,
      sync_completed_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", quotation_id);
    return Response.json({
      ok: true,
      event: { id: event.id, title: event.title, created: eventCreated },
      team_synced: teamSynced,
      service_synced: serviceSynced,
      milestones_synced: milestonesSynced,
      financial_year: fyLabel,
      payments_created: 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
