import { withCors } from "../_shared/cors.ts";
// createTeamMember — Create a new team member with plan limit + single Self check.
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
    const usage = await countUsage(workspace_id, "max_team_members");
    const check = checkResourceLimit(ctx.limits, "max_team_members", usage);
    if (!check.allowed) {
      return Response.json({ error: "PLAN_LIMIT_REACHED", resource: "team members", limit: check.limit, current: check.current, planCode: ctx.planCode }, { status: 403 });
    }

    if (payload.is_self) {
      const { data: existing } = await supabaseAdmin.from("team_members").select("is_self").eq("workspace_id", workspace_id).limit(500);
      const hasSelf = (existing || []).some((m) => m.is_self === true);
      if (hasSelf) return Response.json({ error: "Self is already assigned to another member in this workspace." }, { status: 409 });
    }

    if (!payload.color) {
      const palette = ["#0d9488","#6366f1","#ec4899","#f59e0b","#8b5cf6","#ef4444","#14b8a6","#f97316","#3b82f6","#84cc16","#a855f7","#06b6d4"];
      const { data: existing } = await supabaseAdmin.from("team_members").select("color").eq("workspace_id", workspace_id).limit(500);
      const usedColors = new Set((existing || []).map((m) => m.color).filter(Boolean));
      const available = palette.find((c) => !usedColors.has(c));
      payload.color = available || palette[(existing?.length || 0) % palette.length];
    }

    const { data, error } = await supabaseAdmin
      .from("team_members")
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