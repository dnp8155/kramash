import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWorkspaceMembership } from '../../shared/planEngine.ts';
import { round2, deriveInvoiceStatus } from '../../shared/invoiceHelpers.ts';

// Authenticated endpoint: records a client payment against an invoice.
// Creates a CLIENT_RECEIPT FinancialTransaction linked to the invoice, event, client, and FY.
// Updates the invoice's amount_paid, balance_due, and status.
// Prevents overpayment (amount_paid cannot exceed grand_total).
// Prevents duplicate payment submission via idempotency check.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      workspace_id, invoice_id, amount, payment_method,
      transaction_date, reference_number, notes, financial_year_id
    } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });
    if (!financial_year_id) return Response.json({ error: "financial_year_id required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Load invoice (user-scoped — RLS ensures workspace isolation)
    const inv = await base44.entities.Invoice.get(invoice_id);
    if (!inv || inv.workspace_id !== workspace_id) {
      return Response.json({ error: "Invoice not found in this workspace." }, { status: 404 });
    }

    // Cannot record payments on cancelled or draft invoices
    if (inv.status === "cancelled") {
      return Response.json({ error: "Cannot record payments on a cancelled invoice." }, { status: 400 });
    }
    if (inv.status === "draft") {
      return Response.json({ error: "Invoice must be issued (not draft) before recording payments." }, { status: 400 });
    }

    // Duplicate prevention — check for existing payment with same reference number
    if (reference_number && String(reference_number).trim()) {
      const existing = await base44.entities.FinancialTransaction.filter(
        { workspace_id, invoice_id, reference_number: String(reference_number).trim(), status: "ACTIVE" },
        "-transaction_date", 5
      );
      if (existing && existing.length > 0) {
        return Response.json({ error: "DUPLICATE_PAYMENT", message: "A payment with this reference number already exists for this invoice." }, { status: 409 });
      }
    }

    // Calculate current paid amount from existing transactions
    const existingTxns = await base44.entities.FinancialTransaction.filter(
      { workspace_id, invoice_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
      "-transaction_date", 200
    );
    const currentPaid = round2((existingTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
    const grandTotal = Number(inv.grand_total) || 0;
    const newPaidAmount = round2(currentPaid + amt);

    // Prevent overpayment
    if (newPaidAmount > grandTotal + 0.01) {
      return Response.json({
        error: "OVERPAYMENT_PREVENTED",
        message: `Payment would exceed invoice total. Current paid: ${currentPaid}, Invoice total: ${grandTotal}, Attempted: ${amt}`,
        current_paid: currentPaid,
        balance: round2(grandTotal - currentPaid)
      }, { status: 400 });
    }

    // Create the payment transaction
    const txn = await base44.entities.FinancialTransaction.create({
      workspace_id,
      financial_year_id,
      event_id: inv.event_id || undefined,
      invoice_id: invoice_id,
      client_id: inv.client_id || undefined,
      milestone_id: inv.milestone_id || undefined,
      transaction_type: "CLIENT_RECEIPT",
      amount: amt,
      payment_method: payment_method || "UPI",
      transaction_date,
      reference_number: (reference_number || "").trim(),
      notes: (notes || "").trim(),
      status: "ACTIVE"
    });

    // Update invoice amount_paid, balance_due, and status
    const balanceDue = round2(Math.max(0, grandTotal - newPaidAmount));
    const newStatus = deriveInvoiceStatus({
      grand_total: grandTotal,
      amount_paid: newPaidAmount,
      due_date: inv.due_date,
      status: inv.status
    });

    await base44.entities.Invoice.update(invoice_id, {
      amount_paid: newPaidAmount,
      balance_due: balanceDue,
      status: newStatus
    });

    // If linked to a milestone, reconcile milestone payments
    if (inv.milestone_id) {
      try {
        const milestoneTxns = await base44.entities.FinancialTransaction.filter(
          { workspace_id, milestone_id: inv.milestone_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
          "-transaction_date", 200
        );
        const milestonePaid = round2((milestoneTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const milestone = await base44.entities.PaymentMilestone.get(inv.milestone_id);
        if (milestone) {
          const mDue = Number(milestone.due_amount) || 0;
          let mStatus = "upcoming";
          if (milestonePaid >= mDue && mDue > 0) mStatus = "paid";
          else if (milestonePaid > 0) mStatus = "partially_paid";
          else if (milestone.due_date && milestone.due_date < transaction_date) mStatus = "overdue";
          else if (milestone.due_date && milestone.due_date <= transaction_date) mStatus = "due";

          await base44.entities.PaymentMilestone.update(inv.milestone_id, {
            paid_amount: milestonePaid,
            status: mStatus
          });
        }
      } catch (e) { /* milestone reconciliation failed — non-critical */ }
    }

    return Response.json({
      success: true,
      transaction_id: txn.id,
      invoice_id: invoice_id,
      amount_paid: newPaidAmount,
      balance_due: balanceDue,
      status: newStatus
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}