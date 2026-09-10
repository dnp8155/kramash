// Milestone payment allocation — shared by recordTransaction and any
// future function that needs to reconcile milestone paid amounts.
//
// Milestones are paid in sort_order sequence: the first milestone gets
// paid first, then the second, etc. This mirrors how advance → event day
// → handover typically works in service businesses.
//
// IMPORTANT: This function only runs when an actual CLIENT_RECEIPT is
// recorded or voided. Quotation acceptance does NOT call this —
// acceptance creates dues, not payments.

export function computeMilestoneStatus(
  paid: number,
  amount: number,
  dueDate?: string
): string {
  if (amount > 0 && paid >= amount) return "paid";
  if (paid > 0) return "partially_paid";
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + "T00:00:00");
    due.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
    const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return "due";
  }
  return "upcoming";
}

export async function allocateMilestonePayments(
  base44: any,
  workspaceId: string,
  eventId: string
): Promise<void> {
  const milestones = await base44.asServiceRole.entities.PaymentMilestone.filter(
    { workspace_id: workspaceId, event_id: eventId },
    "sort_order",
    100
  );
  if (!milestones || milestones.length === 0) return;

  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter({
    workspace_id: workspaceId,
    event_id: eventId,
    transaction_type: "CLIENT_RECEIPT",
    status: "ACTIVE",
  });
  const totalPaid = (transactions || []).reduce(
    (s: number, t: any) => s + (t.amount || 0),
    0
  );

  let remaining = totalPaid;
  const updates = milestones.map((m: any) => {
    const paid = Math.min(m.amount || 0, Math.max(0, remaining));
    remaining -= paid;
    return {
      id: m.id,
      paid_amount: paid,
      status: computeMilestoneStatus(paid, m.amount || 0, m.due_date),
    };
  });

  await base44.asServiceRole.entities.PaymentMilestone.bulkUpdate(updates);
}