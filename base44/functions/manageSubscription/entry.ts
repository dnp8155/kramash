import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  resolveActiveSubscription,
  getPlanByCode,
  getPricingById,
  computeExpiry,
  todayStr,
  verifyWorkspaceMembership,
} from "../../shared/planUtils.ts";

// Admin-only function to manage workspace subscriptions.
// Actions: assign, renew, downgrade_to_free, suspend, reactivate
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Only platform admins can manage subscriptions
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, workspace_id, plan_code, pricing_id, start_date, reason } = body;

    if (!action || !workspace_id) {
      return Response.json({ error: "action and workspace_id are required" }, { status: 400 });
    }

    // Verify the workspace exists
    let workspace;
    try {
      workspace = await base44.asServiceRole.entities.Workspace.get(workspace_id);
    } catch {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Resolve the current active subscription (auto-expires if past date)
    const currentSub = await resolveActiveSubscription(base44, workspace_id);

    // ─── Assign / Renew Pro ───
    if (action === "assign" || action === "renew") {
      if (!plan_code || !pricing_id || !start_date) {
        return Response.json({ error: "plan_code, pricing_id, and start_date are required for assign/renew" }, { status: 400 });
      }

      const plan = await getPlanByCode(base44, plan_code);
      if (!plan) return Response.json({ error: `Plan ${plan_code} not found` }, { status: 404 });

      const pricing = await getPricingById(base44, pricing_id);
      if (!pricing) return Response.json({ error: "Pricing option not found" }, { status: 404 });

      const expiresAt = computeExpiry(start_date, pricing.duration_months);

      // Mark the current subscription as CANCELLED (history)
      if (currentSub && currentSub.status !== "EXPIRED") {
        await base44.asServiceRole.entities.WorkspaceSubscription.update(currentSub.id, {
          status: "CANCELLED",
          reason: reason || `Replaced by ${action} (${plan_code} ${pricing.billing_cycle})`,
          updated_by: user.id,
        });
      }

      // Create the new subscription
      const newSub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
        workspace_id,
        plan_id: plan.id,
        pricing_id: pricing.id,
        status: "ACTIVE",
        started_at: start_date,
        expires_at: expiresAt,
        auto_renew: false,
        source: "ADMIN",
        assigned_price: pricing.price,
        billing_cycle_snapshot: pricing.billing_cycle,
        plan_code_snapshot: plan.code,
        updated_by: user.id,
        reason: reason || "",
      });

      // Sync the workspace denormalized fields
      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        plan_type: plan.code === "PRO" ? "pro" : "free",
        plan_status: "active",
      });

      return Response.json({
        success: true,
        subscription: newSub,
        expiresAt,
      });
    }

    // ─── Downgrade to Free ───
    if (action === "downgrade_to_free") {
      const freePlan = await getPlanByCode(base44, "FREE");
      if (!freePlan) return Response.json({ error: "Free plan not found" }, { status: 404 });

      // Mark the current subscription as CANCELLED
      if (currentSub && currentSub.status !== "EXPIRED") {
        await base44.asServiceRole.entities.WorkspaceSubscription.update(currentSub.id, {
          status: "CANCELLED",
          reason: reason || "Downgraded to Free",
          updated_by: user.id,
        });
      }

      // Create a new Free subscription
      const newSub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
        workspace_id,
        plan_id: freePlan.id,
        pricing_id: null,
        status: "ACTIVE",
        started_at: todayStr(),
        expires_at: null,
        auto_renew: false,
        source: "ADMIN",
        assigned_price: 0,
        billing_cycle_snapshot: "FREE",
        plan_code_snapshot: "FREE",
        updated_by: user.id,
        reason: reason || "Downgraded to Free",
      });

      // Sync the workspace
      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        plan_type: "free",
        plan_status: "active",
      });

      return Response.json({ success: true, subscription: newSub });
    }

    // ─── Suspend ───
    if (action === "suspend") {
      if (!currentSub) {
        return Response.json({ error: "No active subscription to suspend" }, { status: 400 });
      }
      await base44.asServiceRole.entities.WorkspaceSubscription.update(currentSub.id, {
        status: "SUSPENDED",
        reason: reason || "Suspended by admin",
        updated_by: user.id,
      });
      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        plan_status: "suspended",
      });
      return Response.json({ success: true });
    }

    // ─── Reactivate ───
    if (action === "reactivate") {
      if (!currentSub) {
        return Response.json({ error: "No subscription to reactivate" }, { status: 400 });
      }
      // Check if the subscription has expired
      if (currentSub.expires_at && currentSub.expires_at < todayStr()) {
        return Response.json({ error: "Subscription has expired. Assign a new plan instead." }, { status: 400 });
      }
      await base44.asServiceRole.entities.WorkspaceSubscription.update(currentSub.id, {
        status: "ACTIVE",
        reason: reason || "Reactivated by admin",
        updated_by: user.id,
      });
      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        plan_status: "active",
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}