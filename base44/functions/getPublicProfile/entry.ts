import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint — no auth required.
// Returns workspace public profile data + social links (from display_preferences)
// + per-field contact visibility flags + business category (for hero image selection).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Read slug from request body (SDK invoke) or query params (direct URL)
    let slug = null;
    try {
      const body = await req.json().catch(() => ({}));
      slug = body?.slug;
    } catch (e) { /* not JSON */ }
    if (!slug) {
      const url = new URL(req.url);
      slug = url.searchParams.get('slug');
    }
    if (!slug) {
      return Response.json({ error: 'slug is required' }, { status: 400 });
    }

    // Find workspace by slug (service role — public endpoint, no user auth)
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({
      public_profile_slug: slug
    }, "-created_date", 10);

    const workspace = workspaces?.[0];
    if (!workspace || !workspace.public_profile_enabled) {
      return Response.json({ error: 'Profile not found or not published' }, { status: 404 });
    }

    // Parse display_preferences JSON for social links + visibility flags
    let dp = {};
    try {
      dp = workspace.display_preferences ? JSON.parse(workspace.display_preferences) : {};
    } catch (e) { /* malformed JSON — treat as empty */ }

    // Visibility flags — default true so existing profiles stay fully visible
    const visibility = {
      phone: dp.public_show_phone !== false,
      email: dp.public_show_email !== false,
      address: dp.public_show_address !== false,
      website: dp.public_show_website !== false,
      social: dp.public_show_social !== false,
    };

    // Social links from Quotation Preferences (display_preferences)
    const social_links = {
      instagram: dp.social_instagram || "",
      youtube: dp.social_youtube || "",
      website: dp.social_website || "",
      portfolio: dp.social_portfolio || "",
    };

    return Response.json({
      workspace: {
        name: workspace.name,
        tagline: workspace.tagline || '',
        logo: workspace.logo || '',
        business_category: workspace.business_category || 'OTHER',
        business_type: workspace.business_type || '',
        custom_business_type: workspace.custom_business_type || '',
        about: workspace.public_profile_about || '',
        address: workspace.address || '',
        city: workspace.city || '',
        state: workspace.state || '',
        country: workspace.country || '',
        phone: workspace.phone || '',
        email: workspace.email || '',
        website: workspace.website || '',
        social_links,
        visibility,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}