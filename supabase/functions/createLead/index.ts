import { withCors } from "../_shared/cors.ts";
// createLead — Create a new lead with plan limit check.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership, resolvePlanContext, countUsage, checkResourceLimit, SUB_STATUS } from "../_shared/planEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, ...payload } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!payload.name) return Response.json({ error: "name required" }, { status: 400 });
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const ctx = await resolvePlanContext(workspace_id);
    if (ctx.subscription && ctx.subscription.status === SUB_STATUS.SUSPENDED) {
      return Response.json({ error: "This workspace is suspended. Please contact support." }, { status: 403 });
    }
    const usage = await countUsage(workspace_id, "max_leads");
    const check = checkResourceLimit(ctx.limits, "max_leads", usage);
    if (!check.allowed) {
      return Response.json({ error: "PLAN_LIMIT_REACHED", resource: "leads", limit: check.limit, current: check.current, planCode: ctx.planCode }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert({ ...payload, workspace_id })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));