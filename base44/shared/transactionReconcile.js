// Transaction reconciliation — keeps invoices and milestones in sync with payments.
import { round2 } from "./quotationHelpers.js";
import { applyAllocations, allocatePaymentAcrossMilestones } from "./milestoneAllocation.js";

export async function reconcileClientReceipt(base44, { workspaceId, clientId, invoiceId, milestoneId, amount, transactionId }) {
  const paymentAmount = round2(Number(amount) || 0);
  if (paymentAmount <= 0) return { updated: false, reason: "invalid_amount" };

  // Update invoice if linked
  let invoiceResult = null;
  if (invoiceId) {
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (invoice) {
      const grand = Number(invoice.grand_total) || 0;
      const newPaid = round2((Number(invoice.amount_paid) || 0) + paymentAmount);
      const balanceDue = round2(Math.max(0, grand - newPaid));
      let status = invoice.status;
      if (balanceDue <= 0) status = "paid";
      else if (newPaid > 0) status = "partial";
      invoiceResult = await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        amount_paid: newPaid,
        balance_due: balanceDue,
        status
      });
    }
  }

  // Update milestone if linked
  let milestoneResult = null;
  if (milestoneId) {
    const milestone = await base44.asServiceRole.entities.PaymentMilestone.get(milestoneId);
    if (milestone) {
      const target = Number(milestone.target_amount) || 0;
      const newPaid = round2((Number(milestone.amount_paid) || 0) + paymentAmount);
      let status = milestone.status;
      if (newPaid >= target && target > 0) status = "paid";
      else if (newPaid > 0) status = "partial";
      milestoneResult = await base44.asServiceRole.entities.PaymentMilestone.update(milestoneId, {
        amount_paid: newPaid,
        status
      });
    }
  }

  return { updated: true, invoice: invoiceResult, milestone: milestoneResult };
}

export async function reconcileTeamPayment(base44, { workspaceId, teamMemberId, teamAssignmentId, amount, transactionId }) {
  // For team payments, we just mark the assignment as paid if agreed rate is fully met.
  if (!teamAssignmentId) return { updated: false, reason: "no_assignment" };
  const assignment = await base44.asServiceRole.entities.EventTeamAssignment.get(teamAssignmentId);
  if (!assignment) return { updated: false, reason: "assignment_not_found" };

  const existingPayments = await base44.asServiceRole.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, team_assignment_id: teamAssignmentId, transaction_type: "TEAM_PAYMENT", status: "ACTIVE" }, "-transaction_date", 500
  );
  const totalPaid = round2((existingPayments || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const agreed = Number(assignment.agreed_rate) || 0;
  const fullyPaid = agreed > 0 && totalPaid >= agreed;

  return { updated: true, totalPaid, fullyPaid };
}