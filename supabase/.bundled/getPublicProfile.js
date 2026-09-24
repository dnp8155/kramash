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

// supabase/functions/getPublicProfile/index.ts
Deno.serve(withCors(async (req) => {
  try {
    let slug = null;
    try {
      const body = await req.json().catch(() => ({}));
      slug = body?.slug;
    } catch {
    }
    if (!slug) {
      const url = new URL(req.url);
      slug = url.searchParams.get("slug");
    }
    if (!slug) return Response.json({ error: "slug is required" }, { status: 400 });
    const { data: workspaces } = await supabaseAdmin.from("workspaces").select("*").eq("public_profile_slug", slug).order("created_at", { ascending: false }).limit(10);
    const workspace = workspaces?.[0];
    if (!workspace || !workspace.public_profile_enabled) {
      return Response.json({ error: "Profile not found or not published" }, { status: 404 });
    }
    let dp = {};
    dp = safeJson(workspace.display_preferences) || {};
    const visibility = {
      phone: dp.public_show_phone !== false,
      email: dp.public_show_email !== false,
      address: dp.public_show_address !== false,
      website: dp.public_show_website !== false,
      social: dp.public_show_social !== false
    };
    const social_links = {
      instagram: dp.social_instagram || "",
      youtube: dp.social_youtube || "",
      website: dp.social_website || "",
      portfolio: dp.social_portfolio || ""
    };
    return Response.json({
      workspace: {
        name: workspace.name,
        tagline: workspace.tagline || "",
        logo: workspace.logo || "",
        business_category: workspace.business_category || "OTHER",
        business_type: workspace.business_type || "",
        custom_business_type: workspace.custom_business_type || "",
        about: workspace.public_profile_about || "",
        address: workspace.address || "",
        city: workspace.city || "",
        state: workspace.state || "",
        country: workspace.country || "",
        phone: workspace.phone || "",
        email: workspace.email || "",
        website: workspace.website || "",
        social_links,
        visibility
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
