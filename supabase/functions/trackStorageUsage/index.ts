// trackStorageUsage — Per-workspace file storage tracking against plan limit.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { resolvePlanContext, verifyWorkspaceMembership } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, action, file_size_bytes } = body || {};
    if (!workspace_id) return Response.json({ error: "workspace_id is required" }, { status: 400 });
    if (!action) return Response.json({ error: "action is required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a member of this workspace" }, { status: 403 });

    const planCtx = await resolvePlanContext(workspace_id);
    const limitBytes = (planCtx.storageGb || 0) * 1024 * 1024 * 1024;

    const { data: existing } = await supabaseAdmin.from("storage_usage").select("*").eq("workspace_id", workspace_id).limit(1);
    let record = (existing && existing[0]) || null;

    if (!record) {
      const { data: created } = await supabaseAdmin.from("storage_usage").insert({ workspace_id, total_bytes: 0, file_count: 0 }).select("*").single();
      record = created;
    }

    if (action === "get") {
      return Response.json({
        total_bytes: record.total_bytes || 0, file_count: record.file_count || 0,
        limit_bytes: limitBytes, storage_gb: planCtx.storageGb || 0, plan_code: planCtx.planCode
      });
    }

    const size = Number(file_size_bytes) || 0;

    if (action === "check") {
      const projected = (record.total_bytes || 0) + size;
      const allowed = limitBytes <= 0 ? true : projected <= limitBytes;
      return Response.json({ allowed, current_bytes: record.total_bytes || 0, limit_bytes: limitBytes, projected_bytes: projected });
    }

    if (action === "add") {
      const projected = (record.total_bytes || 0) + size;
      const { data: updated } = await supabaseAdmin.from("storage_usage").update({ total_bytes: projected, file_count: (record.file_count || 0) + 1 }).eq("id", record.id).select("*").single();
      return Response.json({ allowed: true, total_bytes: updated.total_bytes, file_count: updated.file_count, limit_bytes: limitBytes });
    }

    if (action === "remove") {
      const newBytes = Math.max(0, (record.total_bytes || 0) - size);
      const newCount = Math.max(0, (record.file_count || 0) - 1);
      const { data: updated } = await supabaseAdmin.from("storage_usage").update({ total_bytes: newBytes, file_count: newCount }).eq("id", record.id).select("*").single();
      return Response.json({ total_bytes: updated.total_bytes, file_count: updated.file_count, limit_bytes: limitBytes });
    }

    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});