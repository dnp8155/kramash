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

// supabase/functions/verifyRegistrationOtp/index.ts
var ANON_KEY = "sb_publishable_BKGx06R_bgjb7WT2f7K0OQ_5tPeO7CF";
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const email = body?.email?.toLowerCase().trim();
    const code = body?.code;
    const password = body?.password;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!code || !/^\d{6}$/.test(String(code))) {
      return Response.json({ error: "Valid 6-digit code is required" }, { status: 400 });
    }
    if (!password) {
      return Response.json({ error: "Password is required" }, { status: 400 });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      return Response.json({ error: "Server not configured" }, { status: 500 });
    }
    const anonHeaders = {
      apikey: ANON_KEY,
      "Content-Type": "application/json"
    };
    const signInResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({ email, password })
    });
    const signInData = await signInResp.json();
    if (!signInResp.ok) {
      return Response.json({ error: signInData?.message || "Failed to sign in" }, { status: 400 });
    }
    const accessToken = signInData.access_token;
    const verifyResp = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({
        type: "email",
        token: String(code),
        email
      })
    });
    if (!verifyResp.ok) {
      const verifyData = await verifyResp.json().catch(() => ({}));
      return Response.json({ error: verifyData?.message || verifyData?.msg || "Invalid verification code" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      access_token: signInData.access_token,
      refresh_token: signInData.refresh_token,
      user: signInData.user
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
