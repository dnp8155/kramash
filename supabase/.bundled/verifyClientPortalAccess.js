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

// supabase/functions/_shared/portalCrypto.ts
function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyPassword(password, stored) {
  if (!stored) return false;
  const sep = stored.indexOf(":");
  if (sep < 0) return false;
  const salt = stored.slice(0, sep);
  const hash = stored.slice(sep + 1);
  if (!salt || !hash) return false;
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(salt + ":" + password));
  return bytesToHex(digest) === hash;
}

// supabase/functions/verifyClientPortalAccess/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;
    if (!token || !password) {
      return Response.json({ error: "Token and password are required" }, { status: 400 });
    }
    const { data: clients, error } = await supabaseAdmin.from("clients").select("*").eq("portal_access_token", token).eq("portal_access_enabled", true).order("created_at", { ascending: false }).limit(5);
    if (error || !clients || clients.length === 0) {
      return Response.json({ error: "This link is no longer active. Please contact your service provider." }, { status: 404 });
    }
    const client = clients[0];
    const ok = await verifyPassword(String(password), client.portal_password_hash || "");
    if (!ok) {
      return Response.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }
    return Response.json({
      success: true,
      session_token: client.portal_access_token,
      client_id: client.id,
      workspace_id: client.workspace_id,
      client_name: client.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
