import { withCors } from "../_shared/cors.ts";
// recordInvoicePayment — Client payment against an invoice with overpayment prevention.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { round2, deriveInvoiceStatus } from "../_shared/helpers.ts";
import { computeMilestoneStatus } from "../_shared/transactionReconcile.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id, invoice_id, amount, payment_method, transaction_date, reference_number, notes, financial_year_id } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });
    if (!financial_year_id) return Response.json({ error: "financial_year_id required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: inv } = await supabaseAdmin.from("invoices").select("*").eq("id", invoice_id).single();
    if (!inv || inv.workspace_id !== workspace_id) {
      return Response.json({ error: "Invoice not found in this workspace." }, { status: 404 });
    }
    if (inv.status === "cancelled") return Response.json({ error: "Cannot record payments on a cancelled invoice." }, { status: 400 });
    if (inv.status === "draft") return Response.json({ error: "Invoice must be issued (not draft) before recording payments." }, { status: 400 });

    if (reference_number && String(reference_number).trim()) {
      const { data: existing } = await supabaseAdmin
        .from("financial_transactions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("invoice_id", invoice_id)
        .eq("reference_number", String(reference_number).trim())
        .eq("status", "ACTIVE")
        .limit(5);
      if (existing && existing.length > 0) {
        return Response.json({ error: "DUPLICATE_PAYMENT", message: "A payment with this reference number already exists for this invoice." }, { status: 409 });
      }
    }

    const { data: existingTxns } = await supabaseAdmin
      .from("financial_transactions")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("invoice_id", invoice_id)
      .eq("transaction_type", "CLIENT_RECEIPT")
      .eq("status", "ACTIVE")
      .order("transaction_date", { ascending: false })
      .limit(200);

    const currentPaid = round2((existingTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
    const grandTotal = Number(inv.grand_total) || 0;
    const newPaidAmount = round2(currentPaid + amt);

    if (newPaidAmount > grandTotal + 0.01) {
      return Response.json({
        error: "OVERPAYMENT_PREVENTED",
        message: `Payment would exceed invoice total. Current paid: ${currentPaid}, Invoice total: ${grandTotal}, Attempted: ${amt}`,
        current_paid: currentPaid, balance: round2(grandTotal - currentPaid)
      }, { status: 400 });
    }

    const { data: txn, error: txnErr } = await supabaseAdmin
      .from("financial_transactions")
      .insert({
        workspace_id, financial_year_id,
        event_id: inv.event_id || null, invoice_id, client_id: inv.client_id || null,
        milestone_id: inv.milestone_id || null, transaction_type: "CLIENT_RECEIPT",
        amount: amt, payment_method: payment_method || "UPI",
        transaction_date, reference_number: (reference_number || "").trim(),
        notes: (notes || "").trim(), status: "ACTIVE"
      })
      .select("*")
      .single();
    if (txnErr) throw txnErr;

    const balanceDue = round2(Math.max(0, grandTotal - newPaidAmount));
    const newStatus = deriveInvoiceStatus({ grand_total: grandTotal, amount_paid: newPaidAmount, due_date: inv.due_date, status: inv.status });

    await supabaseAdmin.from("invoices").update({ amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus }).eq("id", invoice_id);

    if (inv.milestone_id) {
      try {
        const { data: mTxns } = await supabaseAdmin
          .from("financial_transactions")
          .select("*")
          .eq("workspace_id", workspace_id)
          .eq("milestone_id", inv.milestone_id)
          .eq("transaction_type", "CLIENT_RECEIPT")
          .eq("status", "ACTIVE")
          .limit(200);
        const milestonePaid = round2((mTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const { data: milestone } = await supabaseAdmin.from("payment_milestones").select("*").eq("id", inv.milestone_id).single();
        if (milestone) {
          const mDue = Number(milestone.due_amount) || 0;
          const mStatus = computeMilestoneStatus(milestonePaid, mDue, milestone.due_date || "");
          await supabaseAdmin.from("payment_milestones").update({ paid_amount: milestonePaid, status: mStatus }).eq("id", inv.milestone_id);
        }
      } catch {}
    }

    return Response.json({ success: true, transaction_id: txn.id, invoice_id, amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));