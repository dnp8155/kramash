import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  verifyWorkspaceMembership,
  resolvePlanContext,
  countUsage,
  checkResourceLimit,
  SUB_STATUS
} from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, ...payload } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!payload.name) return Response.json({ error: "name required" }, { status: 400 });
    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const ctx = await resolvePlanContext(base44, workspace_id);
    if (ctx.subscription && ctx.subscription.status === SUB_STATUS.SUSPENDED) {
      return Response.json({ error: "This workspace is suspended. Please contact support." }, { status: 403 });
    }
    const usage = await countUsage(base44, workspace_id, "max_team_members");
    const check = checkResourceLimit(ctx.limits, "max_team_members", usage);
    if (!check.allowed) {
      return Response.json(
        {
          error: "PLAN_LIMIT_REACHED",
          resource: "team members",
          limit: check.limit,
          current: check.current,
          planCode: ctx.planCode
        },
        { status: 403 }
      );
    }
    const created = await base44.asServiceRole.entities.TeamMember.create({ ...payload, workspace_id });
    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}