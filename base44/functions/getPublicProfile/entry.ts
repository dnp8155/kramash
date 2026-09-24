export async function handle(req, base44) {
  const { slug } = req.body || {};
  if (!slug) return { status: 400, body: { error: "slug required" } };

  const workspaces = await base44.asServiceRole.entities.Workspace.filter(
    { public_profile_slug: slug, public_profile_enabled: true }, "-created_date", 1
  );

  if (!workspaces || workspaces.length === 0) {
    return { status: 404, body: { error: "Profile not found" } };
  }

  const w = workspaces[0];

  // Fetch public-facing services and team showcase
  const services = await base44.asServiceRole.entities.Service.filter(
    { workspace_id: w.id, status: "active", show_in_public_profile: true }, "sort_order", 50
  );

  return {
    status: 200,
    body: {
      workspace: {
        id: w.id,
        name: w.name || "",
        tagline: w.public_profile_tagline || w.tagline || "",
        about: w.public_profile_about || w.about || "",
        logo: w.logo || "",
        cover_image: w.public_profile_cover || "",
        phone: w.phone || "",
        email: w.email || "",
        address: w.address || "",
        city: w.city || "",
        social_links: w.social_links || {},
        business_type: w.business_type || ""
      },
      services: (services || []).map((s) => ({
        id: s.id,
        name: s.name || "",
        description: s.description || "",
        category: s.category || "",
        starting_price: Number(s.starting_price) || 0
      }))
    }
  };
}