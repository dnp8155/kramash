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

// supabase/functions/_shared/helpers.ts
function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// supabase/functions/_shared/teamPortalData.ts
async function buildTeamPortalData(teamMemberId, workspaceId, options = {}) {
  const emailOverride = options.emailOverride || null;
  const nameFallback = options.memberNameFallback || "";
  const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).single();
  const currency = workspace?.currency || "INR";
  const { data: memberRecord } = await supabaseAdmin.from("team_members").select("*").eq("id", teamMemberId).single();
  const { data: teamAssignments } = await supabaseAdmin.from("event_team_assignments").select("*").eq("workspace_id", workspaceId).eq("team_member_id", teamMemberId).order("created_at", { ascending: false }).limit(1e3);
  let serviceAssignments = [];
  try {
    const { data: svcData } = await supabaseAdmin.from("event_service_assignments").select("*").eq("workspace_id", workspaceId).eq("provider_id", teamMemberId).order("created_at", { ascending: false }).limit(500);
    serviceAssignments = svcData || [];
  } catch {
    serviceAssignments = [];
  }
  const { data: transactions } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspaceId).eq("team_member_id", teamMemberId).eq("transaction_type", "TEAM_PAYMENT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(500);
  const eventIds = [.../* @__PURE__ */ new Set([
    ...(teamAssignments || []).map((a) => a.event_id),
    ...(serviceAssignments || []).map((a) => a.event_id)
  ])];
  const events = [];
  for (const eid of eventIds) {
    const { data: ev } = await supabaseAdmin.from("events").select("*").eq("id", eid).single();
    if (ev && ev.workspace_id === workspaceId) events.push(ev);
  }
  const eventsById = {};
  events.forEach((e) => {
    eventsById[e.id] = e;
  });
  const jobSheetTokens = {};
  for (const eid of eventIds) {
    const { data: sheets } = await supabaseAdmin.from("job_sheets").select("*").eq("workspace_id", workspaceId).eq("event_id", eid).order("created_at", { ascending: false }).limit(5);
    const js = sheets?.[0];
    if (js && js.show_job_sheet && js.public_link_enabled && js.public_token) {
      jobSheetTokens[eid] = js.public_token;
    }
  }
  const activeTeamAsgns = (teamAssignments || []).filter((a) => a.assignment_status !== "removed");
  const activeSvcAsgns = (serviceAssignments || []).filter((a) => a.assignment_status !== "removed");
  const teamEarnings = activeTeamAsgns.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const serviceEarnings = activeSvcAsgns.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalEarnings = round2(teamEarnings + serviceEarnings);
  const totalPaid = (transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, round2(totalEarnings - totalPaid));
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const scheduleItems = [];
  for (const a of activeTeamAsgns) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    const bkStart = a.booking_start_date || ev.start_date;
    const bkEnd = a.booking_end_date || ev.end_date || bkStart;
    scheduleItems.push({
      id: a.id,
      type: "team",
      event_id: ev.id,
      event_title: ev.title || "",
      event_type: ev.event_type || "",
      start_date: bkStart || "",
      end_date: bkEnd || "",
      venue: ev.venue || "",
      event_status: ev.status || "upcoming",
      role_name: a.role_name_snapshot || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Per Event",
      working_dates: Array.isArray(a.working_dates) ? a.working_dates : []
    });
  }
  for (const a of activeSvcAsgns) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    scheduleItems.push({
      id: a.id,
      type: "service",
      event_id: ev.id,
      event_title: ev.title || "",
      event_type: ev.event_type || "",
      start_date: ev.start_date || "",
      end_date: ev.end_date || "",
      venue: ev.venue || "",
      event_status: ev.status || "upcoming",
      role_name: a.service_name_snapshot || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Fixed",
      working_dates: []
    });
  }
  const upcoming = scheduleItems.filter((s) => (s.end_date || s.start_date) >= now).sort((a, b) => a.start_date > b.start_date ? 1 : -1);
  const past = scheduleItems.filter((s) => (s.end_date || s.start_date) < now).sort((a, b) => a.start_date < b.start_date ? 1 : -1);
  const projectMap = {};
  for (const s of scheduleItems) {
    if (!projectMap[s.event_id]) {
      projectMap[s.event_id] = {
        id: s.event_id,
        title: s.event_title,
        event_type: s.event_type,
        start_date: s.start_date,
        end_date: s.end_date,
        venue: s.venue,
        status: s.event_status,
        roles: [],
        total_earnings: 0
      };
    }
    if (s.role_name && !projectMap[s.event_id].roles.includes(s.role_name)) {
      projectMap[s.event_id].roles.push(s.role_name);
    }
    projectMap[s.event_id].total_earnings += s.agreed_rate;
  }
  const projects = Object.values(projectMap).filter((p) => p.status !== "cancelled").sort((a, b) => a.start_date < b.start_date ? 1 : -1);
  return {
    member: {
      id: teamMemberId,
      name: memberRecord?.name || nameFallback,
      email: emailOverride || memberRecord?.email || "",
      phone: memberRecord?.phone || "",
      profession: memberRecord?.profession || ""
    },
    workspace: {
      id: workspaceId,
      name: workspace?.name || "",
      logo: workspace?.logo || "",
      phone: workspace?.phone || "",
      email: workspace?.email || "",
      currency
    },
    summary: {
      totalBookings: scheduleItems.length,
      upcomingCount: upcoming.length,
      totalEarnings: round2(totalEarnings),
      totalPaid: round2(totalPaid),
      remaining: round2(remaining)
    },
    upcoming: upcoming.map((s) => ({ ...s, agreed_rate: round2(s.agreed_rate) })),
    past: past.map((s) => ({ ...s, agreed_rate: round2(s.agreed_rate) })),
    projects: projects.map((p) => ({ ...p, total_earnings: round2(p.total_earnings), job_sheet_token: jobSheetTokens[p.id] || null })),
    payments: (transactions || []).map((t) => ({
      id: t.id,
      amount: round2(Number(t.amount) || 0),
      payment_method: t.payment_method || "",
      transaction_date: t.transaction_date || "",
      reference_number: t.reference_number || "",
      notes: t.notes || ""
    }))
  };
}

// supabase/functions/getTeamPortalData/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();
    let teamMemberId = profile?.linked_team_member_id || "";
    let workspaceId = profile?.linked_workspace_id || "";
    let wasAutoLinked = false;
    if (profile?.role !== "team_member" || !teamMemberId) {
      const { data: teamMembers } = await supabaseAdmin.from("team_members").select("*").eq("email", user.email).order("created_at", { ascending: false }).limit(10);
      const match = (teamMembers || []).find((m) => !m.is_self);
      if (match) {
        teamMemberId = match.id;
        workspaceId = match.workspace_id || workspaceId;
        try {
          await supabaseAdmin.from("profiles").update({ role: "team_member", linked_team_member_id: teamMemberId, linked_workspace_id: workspaceId }).eq("id", user.id);
          wasAutoLinked = true;
        } catch {
        }
      }
    }
    if (!teamMemberId || !workspaceId) {
      return Response.json({ error: "Your account is not linked to any team member record. Please contact your service provider to invite you to the portal." }, { status: 404 });
    }
    const data = await buildTeamPortalData(teamMemberId, workspaceId, {
      emailOverride: user.email,
      memberNameFallback: user.user_metadata?.full_name || user.email
    });
    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
