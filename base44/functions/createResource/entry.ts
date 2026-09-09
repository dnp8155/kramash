import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  resolveActiveSubscription,
  getPlanById,
  getPlanLimits,
  getEffectivePlanCode,
  countResourceUsage,
  isLimitExceeded,
  LIMIT_KEY_MAP,
  verifyWorkspaceMembership,
} from "../../shared/planUtils.ts";

// Creates a workspace-scoped resource (Event, TeamMember, Service) with
// server-side plan limit enforcement. This is the authoritative creation path —
// the limit check runs on the backend and cannot be bypassed by frontend code.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, resource_type, resource_data } = body;

    if (!workspace_id || !resource_type || !resource_data) {
      return Response.json({ error: "workspace_id, resource_type, and resource_data are required" }, { status: 400 });
    }

    if (!LIMIT_KEY_MAP[resource_type]) {
      return Response.json({ error: "Invalid resource_type" }, { status: 400 });
    }

    // Verify the user belongs to this workspace
    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }

    // Resolve current subscription + plan + limits
    const subscription = await resolveActiveSubscription(base44, workspace_id);
    const effectivePlanCode = getEffectivePlanCode(subscription);

    let planId = subscription?.plan_id;
    if (!planId || effectivePlanCode === "FREE") {
      const freePlans = await base44.asServiceRole.entities.Plan.filter({ code: "FREE", is_active: true }, "sort_order", 1);
      planId = freePlans && freePlans[0]?.id;
    }

    const plan = planId ? await getPlanById(base44, planId) : null;
    const limits = plan ? await getPlanLimits(base44, plan.id) : {};

    const limitKey = LIMIT_KEY_MAP[resource_type];
    const limit = limits[limitKey] ?? 0;
    const currentUsage = await countResourceUsage(base44, workspace_id, resource_type);

    if (isLimitExceeded(currentUsage, limit)) {
      return Response.json({
        success: false,
        error: "PLAN_LIMIT_REACHED",
        message: `Your ${plan?.name || effectivePlanCode} plan limit for ${resource_type} has been reached (${currentUsage}/${limit >= 999999 ? "∞" : limit}). Upgrade to create more.`,
        currentUsage,
        limit,
        planCode: effectivePlanCode,
      }, { status: 403 });
    }

    // Create the resource with service role (bypasses RLS, but we verified membership)
    let record;
    const data = { ...resource_data, workspace_id };

    if (resource_type === "events") {
      record = await base44.asServiceRole.entities.Event.create(data);
    } else if (resource_type === "team_members") {
      record = await base44.asServiceRole.entities.TeamMember.create(data);
    } else if (resource_type === "services") {
      record = await base44.asServiceRole.entities.Service.create(data);
    }

    return Response.json({
      success: true,
      record,
      planCode: effectivePlanCode,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}