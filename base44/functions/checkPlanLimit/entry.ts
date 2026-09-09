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

// Checks whether a workspace can create a new resource of the given type.
// Runs server-side so the limit check cannot be bypassed by frontend code.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, resource_type } = body;

    if (!workspace_id || !resource_type) {
      return Response.json({ error: "workspace_id and resource_type are required" }, { status: 400 });
    }

    if (!LIMIT_KEY_MAP[resource_type]) {
      return Response.json({ error: "Invalid resource_type" }, { status: 400 });
    }

    // Verify the user belongs to this workspace
    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }

    // Resolve current subscription
    const subscription = await resolveActiveSubscription(base44, workspace_id);
    const effectivePlanCode = getEffectivePlanCode(subscription);

    // Get the plan and its limits
    let planId = subscription?.plan_id;
    if (!planId || effectivePlanCode === "FREE") {
      // Fallback: find the FREE plan
      const freePlans = await base44.asServiceRole.entities.Plan.filter({ code: "FREE", is_active: true }, "sort_order", 1);
      planId = freePlans && freePlans[0]?.id;
    }

    const plan = planId ? await getPlanById(base44, planId) : null;
    const limits = plan ? await getPlanLimits(base44, plan.id) : {};

    const limitKey = LIMIT_KEY_MAP[resource_type];
    const limit = limits[limitKey] ?? 0;
    const currentUsage = await countResourceUsage(base44, workspace_id, resource_type);
    const allowed = !isLimitExceeded(currentUsage, limit);

    return Response.json({
      allowed,
      currentUsage,
      limit,
      limitKey,
      planCode: effectivePlanCode,
      planName: plan?.name || effectivePlanCode,
      subscriptionStatus: subscription?.status || "NONE",
      expiresAt: subscription?.expires_at || null,
      unlimited: limit >= 999999,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}