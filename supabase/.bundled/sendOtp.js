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
var SEND_COOLDOWN_MS = 3e4;
var OTP_TTL_MS = 5 * 60 * 1e3;
function generateOtp() {
  return String(Math.floor(1e5 + Math.random() * 9e5));
}
function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (now > entry.expires) otpStore.delete(phone);
  }
}

// supabase/functions/sendOtp/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const phone = body?.phone;
    if (!phone || !/^\+\d{6,14}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number. Use international format (+91\u2026)." }, { status: 400 });
    }
    const apiKey = Deno.env.get("OTP_PROVIDER_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Phone OTP is not yet available. An external SMS/OTP provider must be configured before codes can be sent.", providerStatus: "pending" }, { status: 503 });
    }
    cleanupExpiredOtps();
    const existing = otpStore.get(phone);
    const now = Date.now();
    if (existing && now - existing.lastSent < SEND_COOLDOWN_MS) {
      const wait = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSent)) / 1e3);
      return Response.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 });
    }
    const code = generateOtp();
    otpStore.set(phone, { code, expires: now + OTP_TTL_MS, attempts: 0, lastSent: now });
    return Response.json({ ok: true, providerStatus: "configured", ttl: 300 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
