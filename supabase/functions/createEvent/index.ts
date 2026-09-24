// createEvent — Create a new event with plan limit check.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership, resolvePlanContext, countUsage, checkResourceLimit, SUB_STATUS } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, ...payload } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!payload.title || !payload.client_id || !payload.start_date) {
      return Response.json({ error: "title, client_id, start_date required" }, { status: 400 });
    }
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: client } = await supabaseAdmin.from("clients").select("*").eq("id", payload.client_id).single();
    if (!client || client.workspace_id !== workspace_id) {
      return Response.json({ error: "Client not found in this workspace" }, { status: 400 });
    }

    const ctx = await resolvePlanContext(workspace_id);
    if (ctx.subscription && ctx.subscription.status === SUB_STATUS.SUSPENDED) {
      return Response.json({ error: "This workspace is suspended. Please contact support." }, { status: 403 });
    }
    const usage = await countUsage(workspace_id, "max_events");
    const check = checkResourceLimit(ctx.limits, "max_events", usage);
    if (!check.allowed) {
      return Response.json({ error: "PLAN_LIMIT_REACHED", resource: "events", limit: check.limit, current: check.current, planCode: ctx.planCode }, { status: 403 });
    }

    const public_token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({ ...payload, workspace_id, public_token, public_tracking_enabled: true })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});