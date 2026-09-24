import { getUserFromRequest } from "../../shared/supabaseAdmin.js";
import { PLAN_CODES, SUBSCRIPTION_STATUS } from "../../shared/planUtils.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };

  const { workspace_id, plan_id, pricing_id, source = "ONBOARDING", assigned_price = 0, note } = req.body || {};
  if (!workspace_id) return { status: 400, body: { error: "workspace_id required" } };
  if (user.role !== "admin" && workspace_id !== user.workspace_id) {
    return { status: 403, body: { error: "Forbidden" } };
  }

  const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter(
    { workspace_id, status: SUBSCRIPTION_STATUS.ACTIVE }, "-started_at", 50
  );
  for (const sub of (existing || [])) {
    await base44.asServiceRole.entities.WorkspaceSubscription.update(sub.id, { status: SUBSCRIPTION_STATUS.EXPIRED });
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const created = await base44.asServiceRole.entities.WorkspaceSubscription.create({
    workspace_id,
    plan_id: plan_id || PLAN_CODES.FREE,
    pricing_id: pricing_id || null,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    started_at: startedAt.toISOString().slice(0, 10),
    expires_at: expiresAt.toISOString().slice(0, 10),
    auto_renew: false,
    source,
    assigned_price: Number(assigned_price) || 0,
    updated_by: user.id,
    note: note || "Initialized via onboarding"
  });

  return { status: 200, body: { subscription: created } };
}