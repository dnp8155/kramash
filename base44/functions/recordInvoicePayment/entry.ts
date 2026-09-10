import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";
import { findFYForDate } from "../../shared/financialYear.ts";
import { allocateMilestonePayments } from "../../shared/milestoneAllocation.ts";

// Records a payment against an invoice.
// 1. Validates invoice is not cancelled/paid
// 2. Prevents overpayment (amount + existing paid > total)
// 3. Creates FinancialTransaction (CLIENT_RECEIPT) with invoice_id
// 4. Recalculates invoice amount_paid, balance_due, status from ALL active transactions
// 5. Triggers milestone allocation if event exists
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

    const invoiceId = body?.invoice_id;
    if (!invoiceId) return Response.json({ error: "invoice_id is required" }, { status: 400 });

    const amount = Number(body?.amount);
    if (!amount || amount <= 0) return Response.json({ error: "A valid positive amount is required" }, { status: 400 });

    const paymentDate = body?.payment_date || new Date().toISOString().slice(0, 10);
    const paymentMethod = body?.payment_method || "Cash";
    const referenceNumber = body?.reference_number || "";
    const notes = body?.notes || "";

    // Fetch invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    // Verify workspace access
    const workspace = await base44.asServiceRole.entities.Workspace.get(invoice.workspace_id);
    if (!workspace) return Response.json({ error: "Not found" }, { status: 404 });
    const isMember = workspace.owner_user_id === user.id || (workspace.member_user_ids || []).includes(user.id) || user.role === "admin";
    if (!isMember) return Response.json({ error: "Unauthorized" }, { status: 403 });

    // Validate invoice state
    if (invoice.status === "Cancelled") return Response.json({ error: "Cannot record payment on a cancelled invoice" }, { status: 400 });
    if (invoice.status === "Paid") return Response.json({ error: "Invoice is already fully paid" }, { status: 400 });

    // Prevent overpayment
    const balanceDue = invoice.balance_due || invoice.total_amount || 0;
    if (amount > balanceDue) {
      return Response.json({ error: `Payment amount exceeds balance due (${balanceDue})` }, { status: 400 });
    }

    // Resolve financial year from payment date
    const fys = await base44.asServiceRole.entities.FinancialYear.filter({ workspace_id: invoice.workspace_id });
    const fy = findFYForDate(paymentDate, fys || []);

    // Create FinancialTransaction
    const transaction = await base44.asServiceRole.entities.FinancialTransaction.create({
      workspace_id: invoice.workspace_id,
      financial_year_id: fy?.id || null,
      event_id: invoice.event_id || null,
      invoice_id: invoiceId,
      transaction_type: "CLIENT_RECEIPT",
      client_id: invoice.client_id,
      amount: amount,
      payment_method: paymentMethod,
      transaction_date: paymentDate,
      reference_number: referenceNumber,
      notes: notes || `Payment for ${invoice.invoice_number}`,
      status: "ACTIVE",
    });

    // Recalculate invoice from ALL active transactions (prevents duplicate counting)
    const allTransactions = await base44.asServiceRole.entities.FinancialTransaction.filter({
      workspace_id: invoice.workspace_id,
      invoice_id: invoiceId,
      transaction_type: "CLIENT_RECEIPT",
      status: "ACTIVE",
    });
    const totalPaid = (allTransactions || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const newBalanceDue = Math.max(0, (invoice.total_amount || 0) - totalPaid);

    // Compute new status
    let newStatus = invoice.status;
    if (newBalanceDue <= 0) newStatus = "Paid";
    else if (totalPaid > 0) newStatus = "Partially Paid";
    else if (invoice.due_date && new Date() > new Date(invoice.due_date + "T23:59:59")) newStatus = "Overdue";
    else newStatus = "Due";

    // Update invoice
    const updated = await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      amount_paid: totalPaid,
      balance_due: newBalanceDue,
      status: newStatus,
    });

    // Trigger milestone allocation if event exists
    if (invoice.event_id) {
      waitUntil(allocateMilestonePayments(base44, invoice.workspace_id, invoice.event_id));
    }

    return Response.json({ invoice: updated, transaction }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}