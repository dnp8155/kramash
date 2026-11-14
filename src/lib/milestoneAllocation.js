// Pure milestone maths (no database access) so both the milestone screens and the payment code can use it.
import { round2 } from "@/lib/quotationCalc";
import { todayISO } from "@/lib/dates";

export const BALANCE_MILESTONE_ID = "__balance__";

// Derive milestone status from paid_amount, due_amount, and due_date.
export function deriveMilestoneStatus(milestone) {
  const due = Number(milestone?.due_amount) || 0;
  const paid = Number(milestone?.paid_amount) || 0;
  const today = todayISO();
  const dueDate = milestone?.due_date || "";

  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}

// Splits what the client has actually paid across the milestones, in order. Receipts linked to a milestone
// (e.g. paid through its invoice) count for it first; everything else, plus any overflow, is poured into the
// milestones in sort order. milestones: [{ id, due_amount, ... }] in order; transactions: the event's transactions.
export function allocateReceivedToMilestones(milestones, transactions) {
  const receipts = (transactions || []).filter((t) => t.transaction_type === "CLIENT_RECEIPT" && t.status === "ACTIVE");
  const totalReceived = round2(receipts.reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const ids = new Set((milestones || []).map((m) => m.id));
  const linked = {};
  for (const t of receipts) if (t.milestone_id && ids.has(t.milestone_id)) linked[t.milestone_id] = round2((linked[t.milestone_id] || 0) + (Number(t.amount) || 0));
  const linkedTotal = round2(Object.values(linked).reduce((s, v) => s + v, 0));

  let pool = Math.max(0, round2(totalReceived - linkedTotal));
  const paidBy = {};
  for (const m of milestones || []) {
    const due = Number(m.due_amount) || 0;
    const own = linked[m.id] || 0;
    paidBy[m.id] = Math.min(own, due);
    pool = round2(pool + Math.max(0, own - due)); // linked money beyond the milestone's due spills forward
  }
  for (const m of milestones || []) {
    const due = Number(m.due_amount) || 0;
    const room = Math.max(0, round2(due - paidBy[m.id]));
    const take = Math.min(room, pool);
    paidBy[m.id] = round2(paidBy[m.id] + take);
    pool = round2(pool - take);
  }
  return (milestones || []).map((m) => {
    const paid = paidBy[m.id] || 0;
    return { ...m, linked_paid: linked[m.id] || 0, paid_amount: paid, status: deriveMilestoneStatus({ ...m, paid_amount: paid }) };
  });
}

// When the milestones do not add up to the full contract value, a "Balance" milestone covers the rest,
// so every rupee of the contract has a place for payments to land. Shown only; it is never saved.
export function withBalanceMilestone(milestones, fullContractValue, label = "Balance") {
  const list = milestones || [];
  if (list.length === 0) return list;
  const covered = round2(list.reduce((s, m) => s + (Number(m.due_amount) || 0), 0));
  const rest = round2((Number(fullContractValue) || 0) - covered);
  if (rest < 1) return list;
  return [...list, {
    id: BALANCE_MILESTONE_ID, name: label, is_balance: true, milestone_type: "fixed", milestone_value: rest,
    due_amount: rest, paid_amount: 0, due_condition: "Remaining amount", due_date: null, sort_order: list.length + 1, status: "upcoming"
  }];
}
