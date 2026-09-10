import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";

// Public endpoint — no auth required. The public_token authorizes access
// to exactly one invoice. Service role is used because there is no
// authenticated user; the token itself is the authorization.
// Internal notes are stripped. No internal IDs beyond the token are exposed.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

    const token = body?.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ public_token: token });
    if (!invoices || invoices.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
    const invoice = invoices[0];

    if (!invoice.public_access_enabled) {
      return Response.json(
        { error: "disabled", message: "This invoice link is no longer available." },
        { status: 403 }
      );
    }

    if (invoice.status === "Cancelled") {
      return Response.json(
        { error: "cancelled", message: "This invoice has been cancelled." },
        { status: 403 }
      );
    }

    // Fetch workspace for branding
    const workspace = await base44.asServiceRole.entities.Workspace.get(invoice.workspace_id);

    // Fetch active payments
    const payments = await base44.asServiceRole.entities.FinancialTransaction.filter({
      workspace_id: invoice.workspace_id,
      invoice_id: invoice.id,
      transaction_type: "CLIENT_RECEIPT",
      status: "ACTIVE",
    });

    // Strip internal notes from public response
    const publicInvoice: any = { ...invoice };
    delete publicInvoice.notes;

    // Increment view count (non-blocking)
    const now = new Date().toISOString();
    waitUntil(
      base44.asServiceRole.entities.Invoice.update(invoice.id, {
        view_count: (invoice.view_count || 0) + 1,
        first_viewed_at: invoice.first_viewed_at || now,
        last_viewed_at: now,
      })
    );

    return Response.json({
      invoice: publicInvoice,
      workspace,
      payments: (payments || []).map((p: any) => ({
        amount: p.amount,
        payment_date: p.transaction_date,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}