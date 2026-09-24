import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };
  if (user.role !== "admin") return { status: 403, body: { error: "Admin only" } };

  const { status, plan, search, limit = 100, offset = 0 } = req.body || {};

  let query = {};
  if (status) query.status = status;
  if (plan) query.plan_id = plan;

  const workspaces = await base44.asServiceRole.entities.Workspace.filter(query, "-created_date", limit, offset);
  const total = await base44.asServiceRole.entities.Workspace.filter({}, "-created_date", 10000);

  let filtered = workspaces || [];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((w) =>
      (w.name || "").toLowerCase().includes(s) ||
      (w.owner_email || "").toLowerCase().includes(s)
    );
  }

  return {
    status: 200,
    body: {
      workspaces: filtered.map((w) => ({
        id: w.id,
        name: w.name || "",
        owner_email: w.owner_email || "",
        status: w.status || "active",
        plan: w.plan_id || "FREE",
        created_date: w.created_date
      })),
      total: (total || []).length
    }
  };
}