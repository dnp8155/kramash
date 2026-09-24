import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };

  const { workspace_id } = req.body || {};
  if (!workspace_id) return { status: 400, body: { error: "workspace_id required" } };

  const [events, clients, quotations, invoices, teamMembers, transactions] = await Promise.all([
    base44.asServiceRole.entities.Event.filter({ workspace_id }, "-created_date", 10000),
    base44.asServiceRole.entities.Client.filter({ workspace_id }, "-created_date", 10000),
    base44.asServiceRole.entities.Quotation.filter({ workspace_id }, "-created_date", 10000),
    base44.asServiceRole.entities.Invoice.filter({ workspace_id }, "-created_date", 10000),
    base44.asServiceRole.entities.TeamMember.filter({ workspace_id }, "-created_date", 10000),
    base44.asServiceRole.entities.FinancialTransaction.filter({ workspace_id }, "-created_date", 10000)
  ]);

  const recordCount = (events?.length || 0) + (clients?.length || 0) + (quotations?.length || 0) +
    (invoices?.length || 0) + (teamMembers?.length || 0) + (transactions?.length || 0);

  const estimatedBytes = recordCount * 2048;
  const estimatedMb = Math.round(estimatedBytes / (1024 * 1024) * 100) / 100;

  const existing = await base44.asServiceRole.entities.StorageUsage.filter(
    { workspace_id }, "-created_date", 1
  );

  if (existing && existing.length > 0) {
    const updated = await base44.asServiceRole.entities.StorageUsage.update(existing[0].id, {
      record_count: recordCount,
      estimated_mb: estimatedMb,
      last_calculated_at: new Date().toISOString()
    });
    return { status: 200, body: { usage: updated } };
  }

  const created = await base44.asServiceRole.entities.StorageUsage.create({
    workspace_id,
    record_count: recordCount,
    estimated_mb: estimatedMb,
    last_calculated_at: new Date().toISOString()
  });

  return { status: 200, body: { usage: created } };
}