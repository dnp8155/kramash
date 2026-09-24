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

// supabase/functions/createTeamAssignment/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const {
      workspace_id,
      event_id,
      team_member_id,
      role_id,
      role_name_snapshot,
      member_type_id,
      member_type_snapshot,
      agreed_rate,
      rate_type,
      working_dates,
      booking_start_date,
      booking_end_date,
      notes
    } = body;
    if (!workspace_id || !event_id || !team_member_id) {
      return Response.json({ error: "workspace_id, event_id, and team_member_id are required." }, { status: 400 });
    }
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });
    const { data: ev } = await supabaseAdmin.from("events").select("*").eq("id", event_id).single();
    if (!ev || ev.workspace_id !== workspace_id) {
      return Response.json({ error: "Event not found in this workspace." }, { status: 404 });
    }
    const { data: member } = await supabaseAdmin.from("team_members").select("*").eq("id", team_member_id).single();
    if (!member || member.workspace_id !== workspace_id) {
      return Response.json({ error: "Team member not found in this workspace." }, { status: 404 });
    }
    const { data: existing } = await supabaseAdmin.from("event_team_assignments").select("id").eq("workspace_id", workspace_id).eq("event_id", event_id).eq("team_member_id", team_member_id).eq("assignment_status", "assigned").limit(1);
    if (existing && existing.length > 0) {
      if (member.is_self) {
        return Response.json({ error: "SELF_ALREADY_ASSIGNED", message: "Owner / Self is already assigned to this event." }, { status: 409 });
      }
      return Response.json({ error: "ALREADY_ASSIGNED", message: `${member.name} is already assigned to this event.` }, { status: 409 });
    }
    const sortedDates = Array.isArray(working_dates) ? [...working_dates].sort() : [];
    const { data: created, error } = await supabaseAdmin.from("event_team_assignments").insert({
      workspace_id,
      event_id,
      team_member_id,
      role_id: role_id || "",
      role_name_snapshot: role_name_snapshot || "",
      member_type_id: member_type_id || "",
      member_type_snapshot: member_type_snapshot || "",
      agreed_rate: Number(agreed_rate) || 0,
      rate_type: rate_type || "Per Event",
      working_dates: sortedDates,
      booking_start_date: booking_start_date || (sortedDates[0] || ""),
      booking_end_date: booking_end_date || (sortedDates[sortedDates.length - 1] || sortedDates[0] || ""),
      assignment_status: "assigned",
      notes: (notes || "").trim()
    }).select("*").single();
    if (error) throw error;
    const currentIds = Array.isArray(ev.team_member_ids) ? ev.team_member_ids : [];
    if (!currentIds.includes(team_member_id)) {
      await supabaseAdmin.from("events").update({ team_member_ids: [...currentIds, team_member_id] }).eq("id", event_id);
    }
    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
