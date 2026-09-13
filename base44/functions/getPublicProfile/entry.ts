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

    return Response.json({
      workspace: {
        name: workspace.name,
        tagline: workspace.tagline || '',
        logo: workspace.logo || '',
        address: workspace.address || '',
        city: workspace.city || '',
        state: workspace.state || '',
        country: workspace.country || '',
        phone: workspace.phone || '',
        email: workspace.email || '',
        website: workspace.website || ''
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}