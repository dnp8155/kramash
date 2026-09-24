// togglePublicLink — Admin toggle for quotation public portal link (Pro-only).
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { generateSecureToken } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { quotation_id, enabled, hide_team_names, portal_password } = body;
    if (!quotation_id) return Response.json({ error: "Quotation id required" }, { status: 400 });

    const { data: q } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("plan_type").eq("id", q.workspace_id).single();
    const isPro = workspace?.plan_type === "pro";
    if (!isPro) {
      return Response.json({ error: "Client Project Portal is a Pro feature. Upgrade to share project portals with clients." }, { status: 403 });
    }

    const updates: any = {};
    if (enabled !== undefined) {
      updates.public_link_enabled = !!enabled;
      if (enabled && !q.public_token) updates.public_token = generateSecureToken();
    }
    if (hide_team_names !== undefined) updates.hide_team_names = !!hide_team_names;
    if (portal_password !== undefined) updates.client_access_password = portal_password ? String(portal_password).trim() : "";

    const { data: updated } = await supabaseAdmin.from("quotations").update(updates).eq("id", quotation_id).select("*").single();

    return Response.json({
      public_link_enabled: !!updated.public_link_enabled, public_token: updated.public_token || "",
      hide_team_names: !!updated.hide_team_names, client_access_password: updated.client_access_password || "",
      portal_view_count: Number(updated.portal_view_count) || 0,
      portal_first_viewed_at: updated.portal_first_viewed_at || "",
      portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});