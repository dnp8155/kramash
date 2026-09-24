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
var SUB_STATUS = { ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", SUSPENDED: "SUSPENDED" };

// supabase/functions/adminSetWorkspaceStatus/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Admin only" }, { status: 403 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
    const body = await req.json();
    const { workspace_id, status, note } = body;
    if (!workspace_id || !status) return Response.json({ error: "workspace_id, status required" }, { status: 400 });
    const subscriptionStatus = status === "SUSPENDED" ? SUB_STATUS.SUSPENDED : SUB_STATUS.ACTIVE;
    const { data: existing } = await supabaseAdmin.from("workspace_subscriptions").select("*").eq("workspace_id", workspace_id).in("status", [SUB_STATUS.ACTIVE, SUB_STATUS.SUSPENDED]);
    for (const s of existing || []) {
      await supabaseAdmin.from("workspace_subscriptions").update({
        status: subscriptionStatus,
        updated_by: user.id,
        note: note || (status === "SUSPENDED" ? "Workspace suspended" : "Workspace reactivated")
      }).eq("id", s.id);
    }
    await supabaseAdmin.from("workspaces").update({ plan_status: status === "SUSPENDED" ? "suspended" : "active" }).eq("id", workspace_id);
    return Response.json({ ok: true, status: subscriptionStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
