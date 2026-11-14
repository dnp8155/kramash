import { withCors } from "../_shared/cors.ts";
// createService — Create a new service with plan limit check.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership, resolvePlanContext, countUsage, checkResourceLimit, SUB_STATUS } from "../_shared/planEngine.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, created_by_id: _ignoredCreator, ...payload } = body; // the creator is always the caller
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!payload.name) return Response.json({ error: "name required" }, { status: 400 });
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const ctx = await resolvePlanContext(workspace_id);
    if (ctx.suspended) {
      return Response.json({ error: "This workspace is suspended. Please contact support." }, { status: 403 });
    }
    const usage = await countUsage(workspace_id, "max_services");
    const check = checkResourceLimit(ctx.limits, "max_services", usage);
    if (!check.allowed) {
      return Response.json({ error: "PLAN_LIMIT_REACHED", resource: "services", limit: check.limit, current: check.current, planCode: ctx.planCode }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      // created_by_id = the person adding it. The service role has no auth.uid(), so the database trigger cannot fill it,
      // and every read rule on this table is "created_by_id = auth.uid()": without it the new row was saved but
      // invisible to its owner (empty Team list, "Cannot coerce the result to a single JSON object" on read-back).
      .insert({ ...payload, workspace_id, created_by_id: user.id })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));