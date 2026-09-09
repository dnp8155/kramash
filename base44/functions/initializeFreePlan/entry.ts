import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getPlanByCode, todayStr, resolveActiveSubscription } from "../../shared/planUtils.ts";

// Called during onboarding to create the default Free subscription for a new workspace.
// Verifies the calling user is the workspace owner (not admin-only, since this is
// initialization — not a subscription modification).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return Response.json({ error: "workspace_id is required" }, { status: 400 });
    }

    // Verify the user is the workspace owner
    const members = await base44.asServiceRole.entities.WorkspaceMember.filter(
      { user_id: user.id, workspace_id, status: "active" },
      "-created_date",
      1
    );
    if (!members || members.length === 0) {
      return Response.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }
    if (members[0].role !== "owner") {
      return Response.json({ error: "Forbidden: only workspace owners can initialize plans" }, { status: 403 });
    }

    // Check if a subscription already exists (idempotent)
    const existing = await resolveActiveSubscription(base44, workspace_id);
    if (existing) {
      return Response.json({ success: true, subscription: existing, alreadyExists: true });
    }

    // Get the FREE plan
    const freePlan = await getPlanByCode(base44, "FREE");
    if (!freePlan) return Response.json({ error: "Free plan not configured" }, { status: 500 });

    // Create the Free subscription
    const subscription = await base44.asServiceRole.entities.WorkspaceSubscription.create({
      workspace_id,
      plan_id: freePlan.id,
      pricing_id: null,
      status: "ACTIVE",
      started_at: todayStr(),
      expires_at: null,
      auto_renew: false,
      source: "ONBOARDING",
      assigned_price: 0,
      billing_cycle_snapshot: "FREE",
      plan_code_snapshot: "FREE",
    });

    return Response.json({ success: true, subscription });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}