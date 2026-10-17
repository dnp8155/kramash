import { withCors } from "../_shared/cors.ts";
// getPublicProfile — Public workspace profile by slug.
// Returns only what the owner chose to show: hidden contact details (phone, email, address, website, social
// links) are left out here on the server, not just hidden by the page, so they can't be read from the response.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { safeJson } from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    let slug = null;
    let workspaceId = null;
    try {
      const body = await req.json().catch(() => ({}));
      slug = body?.slug;
      workspaceId = body?.workspace_id;
    } catch {}
    if (!slug) {
      const url = new URL(req.url);
      slug = url.searchParams.get("slug");
    }
    slug = String(slug || "").trim().slice(0, 60);
    // The client and team portals know the workspace, not its link, so they can ask by workspace id instead.
    workspaceId = /^[0-9a-f-]{36}$/i.test(String(workspaceId || "")) ? String(workspaceId) : "";
    if (!slug && !workspaceId) return Response.json({ error: "slug is required" }, { status: 400 });

    const filtered = supabaseAdmin
      .from("workspaces")
      .select("public_profile_slug, name, tagline, logo, business_category, business_type, custom_business_type, custom_work_label_singular, custom_work_label_plural, public_profile_about, public_profile_enabled, address, city, state, country, phone, email, website, display_preferences");
    const { data: workspaces } = await (slug ? filtered.eq("public_profile_slug", slug) : filtered.eq("id", workspaceId))
      .order("created_at", { ascending: false })
      .limit(1);

    const workspace = workspaces?.[0];
    if (!workspace || !workspace.public_profile_enabled) {
      return Response.json({ error: "Profile not found or not published" }, { status: 404 });
    }

    const dp = safeJson(workspace.display_preferences) || {};

    const visibility = {
      phone: dp.public_show_phone !== false,
      email: dp.public_show_email !== false,
      address: dp.public_show_address !== false,
      website: dp.public_show_website !== false,
      social: dp.public_show_social !== false,
    };

    const social_links = visibility.social ? {
      instagram: dp.social_instagram || "",
      youtube: dp.social_youtube || "",
      website: visibility.website ? (workspace.website || "") : "",
      twitter: dp.social_twitter || dp.social_portfolio || "",
      extra: Array.isArray(dp.social_extra) ? dp.social_extra.slice(0, 2) : [],
    } : { instagram: "", youtube: "", website: "", twitter: "", extra: [] };

    // Counts only for the stats the owner switched on (the database function enforces that).
    let stats = null;
    try {
      const { data: s } = await supabaseAdmin.rpc("get_public_profile_stats", { p_slug: workspace.public_profile_slug });
      stats = s || null;
    } catch { /* stats are optional */ }

    return Response.json({
      v: 2,
      stats,
      workspace: {
        slug: workspace.public_profile_slug,
        name: workspace.name, tagline: workspace.tagline || "", logo: workspace.logo || "",
        business_category: workspace.business_category || "OTHER", business_type: workspace.business_type || "",
        custom_business_type: workspace.custom_business_type || "",
        custom_work_label_singular: workspace.custom_work_label_singular || "",
        custom_work_label_plural: workspace.custom_work_label_plural || "",
        about: workspace.public_profile_about || "",
        address: visibility.address ? (workspace.address || "") : "",
        city: visibility.address ? (workspace.city || "") : "",
        state: visibility.address ? (workspace.state || "") : "",
        country: visibility.address ? (workspace.country || "") : "",
        phone: visibility.phone ? (workspace.phone || "") : "",
        email: visibility.email ? (workspace.email || "") : "",
        website: visibility.website ? (workspace.website || "") : "",
        social_links, visibility,
        sections: dp.public_sections,
        inquiry: dp.public_inquiry_enabled === true,
      },
    });
  } catch {
    return Response.json({ error: "Couldn't load this profile." }, { status: 500 });
  }
}));
