import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };
  if (user.role !== "admin") return { status: 403, body: { error: "Admin only" } };

  const [workspaces, subscriptions, payments, users] = await Promise.all([
    base44.asServiceRole.entities.Workspace.list("-created_date", 500),
    base44.asServiceRole.entities.WorkspaceSubscription.filter({ status: "ACTIVE" }, "-started_at", 500),
    base44.asServiceRole.entities.SubscriptionPayment.filter({ status: "SUCCESS" }, "-created_date", 500),
    base44.asServiceRole.entities.User.list("-created_date", 500)
  ]);

  const activeSubs = (subscriptions || []).filter((s) => s.plan_id === "PRO").length;
  const totalRevenue = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const recentWorkspaces = (workspaces || []).slice(0, 10).map((w) => ({
    id: w.id,
    name: w.name || "",
    created_date: w.created_date,
    owner_email: w.owner_email || ""
  }));

  return {
    status: 200,
    body: {
      totals: {
        workspaces: (workspaces || []).length,
        active_pro: activeSubs,
        total_revenue: totalRevenue,
        users: (users || []).length
      },
      recent_workspaces: recentWorkspaces,
      revenue_by_month: []
    }
  };
}