import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint — no auth required.
// Returns workspace public profile data + active services + active team members
// based on the public_profile_slug.
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

    // Fetch active services
    let services = [];
    try {
      services = await base44.asServiceRole.entities.Service.filter({
        workspace_id: workspace.id,
        status: "active"
      }, "name", 100);
    } catch (e) { /* continue */ }

    // Fetch active team members (exclude those marked is_self to avoid showing owner as a "team member")
    let teamMembers = [];
    try {
      teamMembers = await base44.asServiceRole.entities.TeamMember.filter({
        workspace_id: workspace.id,
        status: "active"
      }, "name", 50);
    } catch (e) { /* continue */ }

    // Parse social links
    let socialLinks = {};
    try {
      socialLinks = workspace.public_profile_social_links
        ? JSON.parse(workspace.public_profile_social_links)
        : {};
    } catch (e) { /* default empty */ }

    // Parse event types
    let eventTypes = [];
    try {
      eventTypes = workspace.event_types ? JSON.parse(workspace.event_types) : [];
    } catch (e) { /* default empty */ }

    return Response.json({
      workspace: {
        name: workspace.name,
        tagline: workspace.tagline || '',
        logo: workspace.logo || '',
        business_type: workspace.business_type || '',
        business_category: workspace.business_category || 'OTHER',
        address: workspace.address || '',
        city: workspace.city || '',
        state: workspace.state || '',
        country: workspace.country || '',
        phone: workspace.phone || '',
        email: workspace.email || '',
        website: workspace.website || '',
        about: workspace.public_profile_about || '',
        event_types: eventTypes
      },
      services: (services || []).map(s => ({
        name: s.name,
        description: s.description || '',
        default_rate: s.default_rate || 0,
        rate_type: s.rate_type || 'Fixed'
      })),
      teamMembers: (teamMembers || []).map(m => ({
        name: m.name,
        profession: m.profession || '',
        role_id: m.role_id || '',
        color: m.color || '#0d9488'
      })),
      socialLinks
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}