import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";
import { reconcileAfterTransactionChange } from "../../shared/transactionReconcile.ts";

// Authenticated endpoint: void (soft-delete) a FinancialTransaction.
// Sets status = "VOID" instead of hard-deleting, preserving audit trail.
// After voiding, recalculates the linked invoice (amount_paid, balance, status)
// and milestone (paid_amount, status) so no orphaned totals remain.
// Rejects voiding of transactions that don't belong to the caller's workspace.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, transaction_id } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });

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
      return Response.json({ error: "Transaction is already voided." }, { status: 400 });
    }

    // Capture links before voiding
    const invoiceId = txn.invoice_id || "";
    const milestoneId = txn.milestone_id || "";

    // Void the transaction (soft delete — preserves audit trail)
    await base44.entities.FinancialTransaction.update(transaction_id, {
      status: "VOID"
    });

    // Reconcile invoice + milestone from remaining ACTIVE transactions
    const reconciled = await reconcileAfterTransactionChange(
      base44, workspace_id, invoiceId, milestoneId
    );

    return Response.json({
      success: true,
      transaction_id,
      voided: true,
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