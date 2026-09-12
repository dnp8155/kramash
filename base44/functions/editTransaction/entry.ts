import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";
import { reconcileAfterTransactionChange } from "../../shared/transactionReconcile.ts";
import { round2 } from "../../shared/invoiceHelpers.ts";

// Authenticated endpoint: edit an existing FinancialTransaction.
// Only amount, payment_method, transaction_date, reference_number, notes,
// and financial_year_id (re-derived from date) are editable.
// transaction_type and all party links (invoice, milestone, event, client,
// team_member, assignment) are NOT editable — preserves audit integrity.
// After editing, recalculates the linked invoice and milestone so balances
// and statuses stay consistent with the updated amount.
// Prevents overpayment: if the new amount would push invoice paid > grand_total,
// the edit is rejected.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      workspace_id, transaction_id,
      amount, payment_method, transaction_date,
      reference_number, notes, financial_year_id
    } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    }
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Load the transaction
    let txn = null;
    try {
      txn = await base44.entities.FinancialTransaction.get(transaction_id);
    } catch (e) { /* not found */ }
    if (!txn || txn.workspace_id !== workspace_id) {
      return Response.json({ error: "Transaction not found in this workspace." }, { status: 404 });
    }
    if (txn.status === "VOID") {
      return Response.json({ error: "Cannot edit a voided transaction." }, { status: 400 });
    }

    // For CLIENT_RECEIPT linked to an invoice: prevent overpayment
    if (txn.transaction_type === "CLIENT_RECEIPT" && txn.invoice_id) {
      let inv = null;
      try {
        inv = await base44.entities.Invoice.get(txn.invoice_id);
      } catch (e) { /* not found */ }
      if (inv && inv.workspace_id === workspace_id) {
        const grandTotal = Number(inv.grand_total) || 0;
        // Sum all OTHER active transactions for this invoice (excluding the one being edited)
        const otherTxns = await base44.entities.FinancialTransaction.filter(
          { workspace_id, invoice_id: txn.invoice_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
          "-transaction_date", 200
        );
        const otherPaid = round2((otherTxns || [])
          .filter((t) => t.id !== transaction_id)
          .reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const newTotal = round2(otherPaid + amt);
        if (newTotal > grandTotal + 0.01) {
          return Response.json({
            error: "OVERPAYMENT_PREVENTED",
            message: `Edited amount would exceed invoice total. Other payments: ${otherPaid}, Invoice total: ${grandTotal}, New total: ${newTotal}`,
            current_other_paid: otherPaid,
            balance: round2(grandTotal - otherPaid)
          }, { status: 400 });
        }
      }
    }

    // Update the transaction
    const updated = await base44.entities.FinancialTransaction.update(transaction_id, {
      amount: amt,
      payment_method: payment_method || txn.payment_method || "Cash",
      transaction_date,
      reference_number: (reference_number || "").trim(),
      notes: (notes || "").trim(),
      financial_year_id: financial_year_id || txn.financial_year_id || ""
    });

    // Reconcile invoice + milestone from all ACTIVE transactions (including the edited one)
    const invoiceId = txn.invoice_id || "";
    const milestoneId = txn.milestone_id || "";
    const reconciled = await reconcileAfterTransactionChange(
      base44, workspace_id, invoiceId, milestoneId
    );

    return Response.json({
      success: true,
      transaction: updated,
      invoice: reconciled.invoice ? {
        id: reconciled.invoice.id,
        amount_paid: reconciled.invoice.amount_paid,
        balance_due: reconciled.invoice.balance_due,
        status: reconciled.invoice.status
      } : null,
      milestone: reconciled.milestone ? {
        id: reconciled.milestone.id,
        paid_amount: reconciled.milestone.paid_amount,
        status: reconciled.milestone.status
      } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}