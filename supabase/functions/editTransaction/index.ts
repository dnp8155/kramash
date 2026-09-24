// editTransaction — Edit amount/method/date of a transaction, then reconcile.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { reconcileAfterTransactionChange } from "../_shared/transactionReconcile.ts";
import { round2 } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, transaction_id, amount, payment_method, transaction_date, reference_number, notes, financial_year_id } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: txn } = await supabaseAdmin.from("financial_transactions").select("*").eq("id", transaction_id).single();
    if (!txn || txn.workspace_id !== workspace_id) {
      return Response.json({ error: "Transaction not found in this workspace." }, { status: 404 });
    }
    if (txn.status === "VOID") return Response.json({ error: "Cannot edit a voided transaction." }, { status: 400 });

    if (txn.transaction_type === "CLIENT_RECEIPT" && txn.invoice_id) {
      const { data: inv } = await supabaseAdmin.from("invoices").select("*").eq("id", txn.invoice_id).single();
      if (inv && inv.workspace_id === workspace_id) {
        const grandTotal = Number(inv.grand_total) || 0;
        const { data: otherTxns } = await supabaseAdmin
          .from("financial_transactions")
          .select("*")
          .eq("workspace_id", workspace_id)
          .eq("invoice_id", txn.invoice_id)
          .eq("transaction_type", "CLIENT_RECEIPT")
          .eq("status", "ACTIVE")
          .limit(200);
        const otherPaid = round2((otherTxns || []).filter((t) => t.id !== transaction_id).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const newTotal = round2(otherPaid + amt);
        if (newTotal > grandTotal + 0.01) {
          return Response.json({
            error: "OVERPAYMENT_PREVENTED",
            message: `Edited amount would exceed invoice total.`,
            current_other_paid: otherPaid, balance: round2(grandTotal - otherPaid)
          }, { status: 400 });
        }
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from("financial_transactions")
      .update({
        amount: amt, payment_method: payment_method || txn.payment_method || "Cash",
        transaction_date, reference_number: (reference_number || "").trim(),
        notes: (notes || "").trim(), financial_year_id: financial_year_id || txn.financial_year_id || ""
      })
      .eq("id", transaction_id)
      .select("*")
      .single();
    if (error) throw error;

    const invoiceId = txn.invoice_id || "";
    const milestoneId = txn.milestone_id || "";
    const reconciled = await reconcileAfterTransactionChange(workspace_id, invoiceId, milestoneId);

    return Response.json({
      success: true, transaction: updated,
      invoice: reconciled.invoice ? { id: reconciled.invoice.id, amount_paid: reconciled.invoice.amount_paid, balance_due: reconciled.invoice.balance_due, status: reconciled.invoice.status } : null,
      milestone: reconciled.milestone ? { id: reconciled.milestone.id, paid_amount: reconciled.milestone.paid_amount, status: reconciled.milestone.status } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});