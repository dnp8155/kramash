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

// supabase/functions/_shared/webauthnCore.ts
function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function getRpId(req) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  try {
    return new URL(origin).hostname;
  } catch {
  }
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
  return host.split(",")[0].trim();
}
function generateChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}
async function createChallengeToken(challenge, userId) {
  const payload = {
    challenge: base64urlEncode(challenge),
    userId,
    exp: Date.now() + 5 * 60 * 1e3
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = base64urlEncode(payloadBytes);
  const appKey = Deno.env.get("BASE44_APP_ID") || Deno.env.get("APP_SECRET") || "fallback-key";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64urlEncode(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

// supabase/functions/_shared/helpers.ts
function safeJson(v) {
  if (v === null || v === void 0) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// supabase/functions/generateWebAuthnAssertionChallenge/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const rpId = getRpId(req);
    if (!rpId) return Response.json({ error: "Could not determine RP ID from request" }, { status: 400 });
    const { data: credentials } = await supabaseAdmin.from("user_auth_credentials").select("*").eq("user_id", user.id);
    if (!credentials || credentials.length === 0) return Response.json({ error: "No registered credentials found" }, { status: 404 });
    const challenge = generateChallenge();
    const challengeToken = await createChallengeToken(challenge, user.id);
    const allowCredentials = credentials.map((c) => {
      const entry = { type: "public-key", id: c.credential_id };
      if (c.transports) {
        entry.transports = safeJson(c.transports) || [];
      }
      return entry;
    });
    return Response.json({ challenge: base64urlEncode(challenge), challengeToken, rpId, allowCredentials, userVerification: "required", timeout: 6e4 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
