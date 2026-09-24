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

// supabase/functions/_shared/portalCrypto.ts
function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomHex(byteLength) {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateAccessToken() {
  return randomHex(24);
}
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => chars[b % chars.length]).join("");
}
async function hashPassword(password) {
  const salt = randomHex(16);
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(salt + ":" + password));
  return `${salt}:${bytesToHex(digest)}`;
}

// supabase/functions/enableTeamPortalAccess/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { team_member_id, workspace_id, action } = body;
    if (!team_member_id || !workspace_id) {
      return Response.json({ error: "team_member_id and workspace_id are required" }, { status: 400 });
    }
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Only workspace members can manage portal access" }, { status: 403 });
    const { data: teamMember } = await supabaseAdmin.from("team_members").select("*").eq("id", team_member_id).single();
    if (!teamMember || teamMember.workspace_id !== workspace_id) {
      return Response.json({ error: "Team member not found in this workspace" }, { status: 404 });
    }
    if (teamMember.is_self) return Response.json({ error: "Portal access is not available for the workspace owner" }, { status: 400 });
    if (action === "disable") {
      await supabaseAdmin.from("team_members").update({ portal_access_enabled: false, portal_password_hash: "", portal_access_token: "" }).eq("id", team_member_id);
      return Response.json({ success: true, enabled: false });
    }
    const accessToken = generateAccessToken();
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    await supabaseAdmin.from("team_members").update({ portal_access_token: accessToken, portal_password_hash: passwordHash, portal_access_enabled: true }).eq("id", team_member_id);
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const loginUrl = `${origin}/team-login/${accessToken}`;
    return Response.json({ success: true, enabled: true, password, login_url: loginUrl, access_token: accessToken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
