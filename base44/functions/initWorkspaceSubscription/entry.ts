import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { PLAN_CODES } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, default_services } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    // Verify the caller is a member of this workspace.
    const memberships = await base44.entities.WorkspaceMember.filter({
      workspace_id: workspace_id,
      user_id: user.id
    });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: "Not a workspace member" }, { status: 403 });
    }

    // Idempotent: do not create a second subscription if one already exists.
    const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({
      workspace_id: workspace_id
    });
    if (existing && existing.length > 0) {
      return Response.json({ ok: true, already_exists: true });
    }

    const plans = await base44.asServiceRole.entities.Plan.filter({ code: PLAN_CODES.FREE });
    const freePlan = plans && plans[0];
    if (!freePlan) return Response.json({ error: "Free plan not configured" }, { status: 500 });

    const today = new Date().toISOString().split("T")[0];
    const sub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
      workspace_id: workspace_id,
      plan_id: freePlan.id,
      pricing_id: "",
      status: "ACTIVE",
      started_at: today,
      expires_at: "",
      auto_renew: false,
      source: "ONBOARDING",
      assigned_price: 0,
      billing_cycle_snapshot: "",
      updated_by: user.id,
      note: "Initial Free plan"
    });

    // Seed default services only if the workspace has none yet.
    const existingServices = await base44.asServiceRole.entities.Service.filter({
      workspace_id: workspace_id
    });
    if ((!existingServices || existingServices.length === 0) && Array.isArray(default_services)) {
      await base44.asServiceRole.entities.Service.bulkCreate(
        default_services.map((s) => ({ ...s, workspace_id: workspace_id, status: "active" }))
      );
    }

    return Response.json({ ok: true, subscription_id: sub.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}