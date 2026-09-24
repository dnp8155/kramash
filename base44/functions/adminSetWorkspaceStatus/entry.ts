// adminSetWorkspaceStatus — Admin: activate/suspend a workspace.
// Ported from supabase/functions/adminSetWorkspaceStatus — uses Supabase admin client.
import { getSupabaseAdmin, getUserFromRequest } from "../../shared/supabaseAdmin.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id, status, reason } = body;
    if (!workspace_id || !status) return Response.json({ error: "workspace_id and status required" }, { status: 400 });

    const valid = ["active", "suspended", "deleted"];
    if (!valid.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });

    const { data: ws } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

    const updates = { status, status_reason: reason || null, status_updated_at: new Date().toISOString() };
    const { data: updated } = await supabaseAdmin.from("workspaces").update(updates).eq("id", workspace_id).select("*").single();

    return Response.json({ ok: true, workspace: { id: updated.id, name: updated.name, status: updated.status } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}