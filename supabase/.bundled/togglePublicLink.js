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
function generateSecureToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// supabase/functions/togglePublicLink/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { quotation_id, enabled, hide_team_names, portal_password } = body;
    if (!quotation_id) return Response.json({ error: "Quotation id required" }, { status: 400 });
    const { data: q } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });
    const { data: workspace } = await supabaseAdmin.from("workspaces").select("plan_type").eq("id", q.workspace_id).single();
    const isPro = workspace?.plan_type === "pro";
    if (!isPro) {
      return Response.json({ error: "Client Project Portal is a Pro feature. Upgrade to share project portals with clients." }, { status: 403 });
    }
    const updates = {};
    if (enabled !== void 0) {
      updates.public_link_enabled = !!enabled;
      if (enabled && !q.public_token) updates.public_token = generateSecureToken();
    }
    if (hide_team_names !== void 0) updates.hide_team_names = !!hide_team_names;
    if (portal_password !== void 0) updates.client_access_password = portal_password ? String(portal_password).trim() : "";
    const { data: updated } = await supabaseAdmin.from("quotations").update(updates).eq("id", quotation_id).select("*").single();
    return Response.json({
      public_link_enabled: !!updated.public_link_enabled,
      public_token: updated.public_token || "",
      hide_team_names: !!updated.hide_team_names,
      client_access_password: updated.client_access_password || "",
      portal_view_count: Number(updated.portal_view_count) || 0,
      portal_first_viewed_at: updated.portal_first_viewed_at || "",
      portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
