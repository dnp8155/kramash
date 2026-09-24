import { withCors } from "../_shared/cors.ts";
// voidTransaction — Soft-delete (status=VOID) + reconcile invoice/milestone.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { reconcileAfterTransactionChange } from "../_shared/transactionReconcile.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, transaction_id } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: txn } = await supabaseAdmin.from("financial_transactions").select("*").eq("id", transaction_id).single();
    if (!txn || txn.workspace_id !== workspace_id) {
      return Response.json({ error: "Transaction not found in this workspace." }, { status: 404 });
    }
    if (txn.status === "VOID") return Response.json({ error: "Transaction is already voided." }, { status: 400 });

    const invoiceId = txn.invoice_id || "";
    const milestoneId = txn.milestone_id || "";

    await supabaseAdmin.from("financial_transactions").update({ status: "VOID" }).eq("id", transaction_id);
    const reconciled = await reconcileAfterTransactionChange(workspace_id, invoiceId, milestoneId);

    return Response.json({
      success: true, transaction_id, voided: true,
      invoice: reconciled.invoice ? { id: reconciled.invoice.id, amount_paid: reconciled.invoice.amount_paid, balance_due: reconciled.invoice.balance_due, status: reconciled.invoice.status } : null,
      milestone: reconciled.milestone ? { id: reconciled.milestone.id, paid_amount: reconciled.milestone.paid_amount, status: reconciled.milestone.status } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));