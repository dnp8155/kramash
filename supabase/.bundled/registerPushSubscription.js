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

// supabase/functions/registerPushSubscription/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint) return Response.json({ error: "subscription with endpoint is required" }, { status: 400 });
    const { data: existing } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", user.id).eq("endpoint", subscription.endpoint);
    if (existing && existing.length > 0) {
      const { data: updated } = await supabaseAdmin.from("push_subscriptions").update({
        p256dh_key: subscription.keys?.p256dh || existing[0].p256dh_key,
        auth_key: subscription.keys?.auth || existing[0].auth_key
      }).eq("id", existing[0].id).select("*").single();
      return Response.json({ success: true, subscription: updated });
    }
    const { data: created } = await supabaseAdmin.from("push_subscriptions").insert({
      user_id: user.id,
      platform: "web",
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys?.p256dh || "",
      auth_key: subscription.keys?.auth || ""
    }).select("*").single();
    return Response.json({ success: true, subscription: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
