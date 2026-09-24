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

// supabase/functions/verifyFirebaseToken/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { token, phone, uid } = body;
    if (!token || !phone) return Response.json({ error: "Missing Firebase token or phone." }, { status: 400 });
    const apiKey = Deno.env.get("FIREBASE_API_KEY");
    if (!apiKey) return Response.json({ error: "Firebase phone authentication is not configured." }, { status: 503 });
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return Response.json({ error: "Invalid or expired Firebase token.", details: err?.error?.message }, { status: 401 });
    }
    const verifyData = await verifyRes.json();
    const fbUser = verifyData?.users?.[0];
    if (!fbUser || fbUser.phoneNumber !== phone) return Response.json({ error: "Phone number mismatch." }, { status: 401 });
    const { data: users } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(2e3);
    const matchedUser = (users || []).find((u) => u.phone === phone);
    if (!matchedUser) {
      return Response.json({ ok: true, needsRegistration: true, phone, firebaseUid: uid || fbUser.localId });
    }
    return Response.json({ ok: true, phone, user: { id: matchedUser.id, email: matchedUser.email, full_name: matchedUser.full_name }, authenticated: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
