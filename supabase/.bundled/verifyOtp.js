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

// supabase/functions/_shared/otpStore.ts
var otpStore = /* @__PURE__ */ new Map();
var OTP_TTL_MS = 5 * 60 * 1e3;
var MAX_ATTEMPTS = 5;
function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (now > entry.expires) otpStore.delete(phone);
  }
}

// supabase/functions/verifyOtp/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const phone = body?.phone;
    const code = body?.code;
    if (!phone || !/^\+\d{6,14}$/.test(phone)) return Response.json({ error: "Invalid phone number." }, { status: 400 });
    if (!code || !/^\d{4,6}$/.test(String(code))) return Response.json({ error: "Invalid code format." }, { status: 400 });
    cleanupExpiredOtps();
    const entry = otpStore.get(phone);
    if (!entry) return Response.json({ error: "No code was sent to this number. Please request a new one." }, { status: 400 });
    const now = Date.now();
    if (now > entry.expires) {
      otpStore.delete(phone);
      return Response.json({ error: "This code has expired. Please request a new one." }, { status: 400 });
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(phone);
      return Response.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
    }
    if (entry.code !== String(code)) {
      entry.attempts++;
      otpStore.set(phone, entry);
      const remaining = MAX_ATTEMPTS - entry.attempts;
      return Response.json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` }, { status: 400 });
    }
    otpStore.delete(phone);
    const apiKey = Deno.env.get("OTP_PROVIDER_API_KEY");
    if (!apiKey) return Response.json({ error: "Phone OTP provider is not configured." }, { status: 503 });
    return Response.json({ ok: true, phone, authenticated: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
