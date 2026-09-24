// Milestone allocation engine — distributes client receipts across milestone dues.
import { round2 } from "./quotationHelpers.js";

export function sortMilestones(milestones) {
  return [...(milestones || [])].sort((a, b) => {
    const aDue = a.due_date ? new Date(a.due_date).getTime() : 0;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : 0;
    if (aDue !== bDue) return aDue - bDue;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export function allocatePaymentAcrossMilestones(milestones, paymentAmount) {
  const sorted = sortMilestones(milestones);
  let remaining = round2(Number(paymentAmount) || 0);
  const allocations = [];

  for (const m of sorted) {
    if (remaining <= 0) break;
    const targetAmount = Number(m.target_amount) || 0;
    const alreadyPaid = Number(m.amount_paid) || 0;
    const due = round2(Math.max(0, targetAmount - alreadyPaid));
    if (due <= 0) continue;
    const applied = round2(Math.min(due, remaining));
    allocations.push({ milestone_id: m.id, applied_amount: applied });
    remaining = round2(remaining - applied);
  }

  return { allocations, unallocated: remaining };
}

export function applyAllocations(milestones, allocations) {
  const map = new Map((allocations || []).map((a) => [a.milestone_id, a.applied_amount]));
  return (milestones || []).map((m) => {
    const applied = map.get(m.id) || 0;
    if (!applied) return m;
    const newPaid = round2((Number(m.amount_paid) || 0) + applied);
    const target = Number(m.target_amount) || 0;
    let status = m.status;
    if (newPaid >= target && target > 0) status = "paid";
    else if (newPaid > 0) status = "partial";
    return { ...m, amount_paid: newPaid, status };
  });
}