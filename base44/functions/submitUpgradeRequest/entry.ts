import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, requested_pricing_id, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    // Verify membership.
    const memberships = await base44.entities.WorkspaceMember.filter({
      workspace_id: workspace_id,
      user_id: user.id
    });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: "Not a workspace member" }, { status: 403 });
    }

    const created = await base44.entities.UpgradeRequest.create({
      workspace_id: workspace_id,
      requested_plan: "PRO",
      requested_pricing_id: requested_pricing_id || "",
      status: "PENDING",
      requested_at: new Date().toISOString(),
      note: note || ""
    });

    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}