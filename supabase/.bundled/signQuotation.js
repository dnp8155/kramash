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

// supabase/functions/signQuotation/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { signature, signed_by_name, consent } = body;
    const token = body.public_token || body.token;
    if (!token) return Response.json({ error: "Quotation token required" }, { status: 400 });
    if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) {
      return Response.json({ error: "A valid signature is required" }, { status: 400 });
    }
    if (!signed_by_name || !signed_by_name.trim()) return Response.json({ error: "Your name is required to sign" }, { status: 400 });
    if (!consent) return Response.json({ error: "You must agree to the terms before signing" }, { status: 400 });
    const { data: list } = await supabaseAdmin.from("quotations").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    const q = list && list.length > 0 ? list[0] : null;
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (q.valid_until && q.valid_until < todayStr) {
      return Response.json({ error: "This quotation has expired and can no longer be signed." }, { status: 403 });
    }
    if (q.status === "accepted" && q.signed_at) {
      return Response.json({ error: "This quotation has already been signed.", already_signed: true }, { status: 409 });
    }
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation cannot be signed yet." }, { status: 403 });
    }
    if (q.client_access_password) {
      const { email, password } = body;
      if (!password || password !== q.client_access_password) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
      let clientEmail = "";
      const snap = safeJson(q.client_snapshot) || {};
      clientEmail = (snap.email || "").trim().toLowerCase();
      if (clientEmail && (!email || email.trim().toLowerCase() !== clientEmail)) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
    }
    const { data: updated } = await supabaseAdmin.from("quotations").update({
      status: "accepted",
      client_signature: signature,
      signed_by_name: signed_by_name.trim(),
      signed_at: (/* @__PURE__ */ new Date()).toISOString(),
      sync_pending: true
    }).eq("id", q.id).select("*").single();
    return Response.json({
      ok: true,
      quotation: {
        status: updated.status,
        signed_by_name: updated.signed_by_name,
        signed_at: updated.signed_at,
        client_signature: updated.client_signature
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
