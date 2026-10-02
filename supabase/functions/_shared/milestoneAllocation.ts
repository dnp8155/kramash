// Milestone payment allocation — milestones are paid in sort_order sequence.
// Runs when an actual CLIENT_RECEIPT is recorded or voided.

import { supabaseAdmin } from "./supabaseClient.ts";

export function computeMilestoneStatus(paid: number, amount: number, dueDate?: string): string {
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

export async function allocateMilestonePayments(workspaceId: string, eventId: string): Promise<void> {
  const { data: milestones } = await supabaseAdmin
    .from("payment_milestones")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .limit(100);

  if (!milestones || milestones.length === 0) return;

  const { data: transactions } = await supabaseAdmin
    .from("financial_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("event_id", eventId)
    .eq("transaction_type", "CLIENT_RECEIPT")
    .eq("status", "ACTIVE");

  const totalPaid = (transactions || []).reduce((s, t) => s + (t.amount || 0), 0);

  let remaining = totalPaid;
  const updates = milestones.map((m) => {
    const paid = Math.min(m.amount || 0, Math.max(0, remaining));
    remaining -= paid;
    return {
      id: m.id,
      paid_amount: paid,
      status: computeMilestoneStatus(paid, m.amount || 0, m.due_date),
    };
  });

  for (const u of updates) {
    await supabaseAdmin
      .from("payment_milestones")
      .update({ paid_amount: u.paid_amount, status: u.status })
      .eq("id", u.id);
  }
}