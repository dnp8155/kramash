import { withCors } from "../_shared/cors.ts";
// submitUpgradeRequest — Workspace member submits a Pro upgrade request.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, requested_pricing_id, note } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });

    const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", user.id).limit(1);
    if (!memberships || memberships.length === 0) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: created } = await supabaseAdmin.from("upgrade_requests").insert({
      workspace_id, requested_plan: "PRO", requested_pricing_id: requested_pricing_id || "",
      status: "PENDING", requested_at: new Date().toISOString(), note: note || ""
    }).select("*").single();

    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));