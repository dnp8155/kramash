// Shared client portal data builder for Base44 backend functions.
import { round2 } from "./quotationHelpers.js";

export async function buildClientPortalData(base44, clientId, workspaceId, options = {}) {
  const emailOverride = options.emailOverride || null;
  const nameFallback = options.clientNameFallback || "";

  let workspace = null;
  try { workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId); } catch (e) { }

  const currency = workspace?.currency || "INR";

  let clientRecord = null;
  try { clientRecord = await base44.asServiceRole.entities.Client.get(clientId); } catch (e) { }

  const events = await base44.asServiceRole.entities.Event.filter(
    { workspace_id: workspaceId, client_id: clientId }, "-start_date", 200
  );
  const quotations = await base44.asServiceRole.entities.Quotation.filter(
    { workspace_id: workspaceId, client_id: clientId }, "-created_date", 200
  );
  const invoices = await base44.asServiceRole.entities.Invoice.filter(
    { workspace_id: workspaceId, client_id: clientId }, "-created_date", 200
  );
  const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, client_id: clientId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" }, "-transaction_date", 500
  );

  const totalQuoted = (quotations || []).filter((q) => q.status === "accepted").reduce((s, q) => s + (Number(q.grand_total) || 0), 0);
  const totalInvoiced = (invoices || []).reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalPaid = (transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balanceDue = Math.max(0, round2(totalInvoiced - totalPaid));

  return {
    client: { id: clientId, name: clientRecord?.name || nameFallback, email: emailOverride || clientRecord?.email || "" },
    workspace: { id: workspaceId, name: workspace?.name || "", logo: workspace?.logo || "", phone: workspace?.phone || "", email: workspace?.email || "", currency },
    summary: { totalEvents: (events || []).length, totalQuoted: round2(totalQuoted), totalInvoiced: round2(totalInvoiced), totalPaid: round2(totalPaid), balanceDue: round2(balanceDue) },
    events: (events || []).map((e) => ({ id: e.id, title: e.title || "", event_type: e.event_type || "", start_date: e.start_date || "", end_date: e.end_date || "", venue: e.venue || "", status: e.status || "upcoming", contract_value: Number(e.contract_value) || 0 })),
    quotations: (quotations || []).map((q) => ({ id: q.id, quotation_number: q.quotation_number || "", quotation_date: q.quotation_date || "", status: q.status || "draft", grand_total: Number(q.grand_total) || 0, public_token: q.public_token || "", public_link_enabled: !!q.public_link_enabled, project_title: q.project_title || "" })),
    invoices: (invoices || []).map((inv) => ({ id: inv.id, invoice_number: inv.invoice_number || "", invoice_date: inv.invoice_date || "", due_date: inv.due_date || "", status: inv.status || "draft", grand_total: Number(inv.grand_total) || 0, amount_paid: Number(inv.amount_paid) || 0, balance_due: Number(inv.balance_due) || 0, public_token: inv.public_token || "", public_link_enabled: !!inv.public_link_enabled })),
    transactions: (transactions || []).map((t) => ({ id: t.id, amount: Number(t.amount) || 0, payment_method: t.payment_method || "", transaction_date: t.transaction_date || "", reference_number: t.reference_number || "" }))
  };
}