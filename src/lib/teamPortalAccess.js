import { supabase } from "@/lib/supabaseClient";

// Client-side Team Member Portal access helpers — replaces the Edge Functions
// (verifyTeamPortalAccess / getTeamPortalDataByAccess) that are not deployed.
// Uses Supabase RPC functions (verify_team_portal / get_team_portal_data)
// which run with SECURITY DEFINER to bypass RLS for unauthenticated portal users.

// Verify a portal password via Supabase RPC (no Edge Function).
// Returns { session_token, team_member_id, workspace_id, member_name } on success.
export async function verifyTeamPortalPassword(token, password) {
  const { data, error } = await supabase.rpc("verify_team_portal", {
    p_token: token,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// Load all team portal data client-side via Supabase RPC (no Edge Function).
// Returns a payload that the TeamMemberPortal page renders.
// The RPC returns raw assignments + events + job_sheets; we assemble the
// final shape (upcoming, past, projects, summary) here in JS to match the
// original buildTeamPortalData output.
export async function loadTeamPortalData(sessionToken, teamMemberId) {
  const { data, error } = await supabase.rpc("get_team_portal_data", {
    p_session_token: sessionToken,
    p_team_member_id: teamMemberId,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  // Assemble schedule items + projects from the raw RPC payload
  const eventsById = {};
  (data.events || []).forEach((e) => { eventsById[e.id] = e; });

  const jobSheetTokens = {};
  (data.job_sheets || []).forEach((js) => { jobSheetTokens[js.event_id] = js.public_token; });

  const scheduleItems = [];
  for (const a of data.team_assignments || []) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    const bkStart = a.booking_start_date || ev.start_date;
    const bkEnd = a.booking_end_date || ev.end_date || bkStart;
    scheduleItems.push({
      id: a.id, type: "team", event_id: ev.id,
      event_title: ev.title || "", event_type: ev.event_type || "",
      start_date: bkStart || "", end_date: bkEnd || "",
      venue: ev.venue || "", event_status: ev.status || "upcoming",
      role_name: a.role_name || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Per Event",
      working_dates: Array.isArray(a.working_dates) ? a.working_dates : []
    });
  }
  for (const a of data.service_assignments || []) {
    const ev = eventsById[a.event_id];
    if (!ev || ev.status === "cancelled") continue;
    scheduleItems.push({
      id: a.id, type: "service", event_id: ev.id,
      event_title: ev.title || "", event_type: ev.event_type || "",
      start_date: ev.start_date || "", end_date: ev.end_date || "",
      venue: ev.venue || "", event_status: ev.status || "upcoming",
      role_name: a.role_name || "",
      agreed_rate: Number(a.agreed_rate) || 0,
      rate_type: a.rate_type || "Fixed",
      working_dates: []
    });
  }

  const now = new Date().toISOString().split("T")[0];
  const upcoming = scheduleItems
    .filter((s) => (s.end_date || s.start_date) >= now)
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1));
  const past = scheduleItems
    .filter((s) => (s.end_date || s.start_date) < now)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  const projectMap = {};
  for (const s of scheduleItems) {
    if (!projectMap[s.event_id]) {
      projectMap[s.event_id] = {
        id: s.event_id, title: s.event_title, event_type: s.event_type,
        start_date: s.start_date, end_date: s.end_date, venue: s.venue,
        status: s.event_status, roles: [], total_earnings: 0
      };
    }
    if (s.role_name && !projectMap[s.event_id].roles.includes(s.role_name)) {
      projectMap[s.event_id].roles.push(s.role_name);
    }
    projectMap[s.event_id].total_earnings += s.agreed_rate;
  }
  const projects = Object.values(projectMap)
    .filter((p) => p.status !== "cancelled")
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  return {
    member: data.member,
    workspace: data.workspace,
    summary: {
      totalBookings: scheduleItems.length,
      upcomingCount: upcoming.length,
      totalEarnings: round2(data.summary?.totalEarnings),
      totalPaid: round2(data.summary?.totalPaid),
      remaining: round2(data.summary?.remaining)
    },
    upcoming: upcoming.map((s) => ({ ...s, agreed_rate: round2(s.agreed_rate) })),
    past: past.map((s) => ({ ...s, agreed_rate: round2(s.agreed_rate) })),
    projects: projects.map((p) => ({
      ...p, total_earnings: round2(p.total_earnings),
      job_sheet_token: jobSheetTokens[p.id] || null
    })),
    payments: (data.transactions || []).map((t) => ({
      id: t.id, amount: round2(t.amount),
      payment_method: t.payment_method || "",
      transaction_date: t.transaction_date || "",
      reference_number: t.reference_number || "",
      notes: t.notes || ""
    }))
  };
}