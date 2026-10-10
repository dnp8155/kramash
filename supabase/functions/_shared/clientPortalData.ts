// Shared builder for the Client Portal data payload.
// Used by both get-client-portal-data (invited-user path) and
// get-client-portal-data-by-access (password-only portal path).

import { supabaseAdmin } from "./supabaseClient.ts";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function buildClientPortalData(clientId: string, workspaceId: string, options: { emailOverride?: string; clientNameFallback?: string } = {}) {
  const emailOverride = options.emailOverride || null;
  const nameFallback = options.clientNameFallback || "";

  // Workspace
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  const currency = workspace?.currency || "INR";

  // Client
  const { data: clientRecord } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  // Events
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("start_date", { ascending: false })
    .limit(200);

  // Quotations
  // Drafts are work in progress — a client only ever sees quotations/invoices that have been finalized/issued.
  const { data: quotations } = await supabaseAdmin
    .from("quotations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(200);

  // Invoices
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(200);

  // Transactions (client receipts only, active)
  const { data: transactions } = await supabaseAdmin
    .from("financial_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("transaction_type", "CLIENT_RECEIPT")
    .eq("status", "ACTIVE")
    .order("transaction_date", { ascending: false })
    .limit(500);

  const totalQuoted = (quotations || [])
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);
  // Only issued, non-cancelled invoices count; paid/balance are computed per invoice
  // so receipts for other invoices/projects never offset an unrelated invoice.
  const activeInvoices = (invoices || []).filter((inv) => inv.status !== "cancelled");
  const paidByInvoice = new Map<string, number>();
  for (const t of transactions || []) {
    if (!t.invoice_id) continue;
    paidByInvoice.set(t.invoice_id, (paidByInvoice.get(t.invoice_id) || 0) + (Number(t.amount) || 0));
  }
  let totalInvoiced = 0;
  let totalPaid = 0;
  let balanceDue = 0;
  for (const inv of activeInvoices) {
    const total = Number(inv.grand_total) || 0;
    const paid = paidByInvoice.get(inv.id) || 0;
    totalInvoiced += total;
    totalPaid += Math.min(total, paid);
    balanceDue += Math.max(0, total - paid);
  }
  balanceDue = round2(balanceDue);

  return {
    client: {
      id: clientId,
      name: clientRecord?.name || nameFallback,
      email: emailOverride || clientRecord?.email || "",
    },
    workspace: {
      id: workspaceId,
      name: workspace?.name || "",
      logo: workspace?.logo || "",
      phone: workspace?.phone || "",
      email: workspace?.email || "",
      currency,
    },
    summary: {
      totalEvents: (events || []).length,
      totalQuoted: round2(totalQuoted),
      totalInvoiced: round2(totalInvoiced),
      totalPaid: round2(totalPaid),
      balanceDue: round2(balanceDue),
    },
    events: (events || []).map((e) => ({
      id: e.id,
      title: e.title || "",
      event_type: e.event_type || "",
      start_date: e.start_date || "",
      end_date: e.end_date || "",
      venue: e.venue || "",
      status: e.status || "upcoming",
      contract_value: Number(e.contract_value) || 0,
    })),
    quotations: (quotations || []).map((q) => ({
      id: q.id,
      quotation_number: q.quotation_number || "",
      quotation_date: q.quotation_date || "",
      status: q.status || "draft",
      grand_total: Number(q.grand_total) || 0,
      public_token: q.public_token || "",
      public_link_enabled: !!q.public_link_enabled,
      project_title: q.project_title || "",
    })),
    invoices: (invoices || []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number || "",
      invoice_date: inv.invoice_date || "",
      due_date: inv.due_date || "",
      status: inv.status || "draft",
      grand_total: Number(inv.grand_total) || 0,
      amount_paid: Number(inv.amount_paid) || 0,
      balance_due: round2(Math.max(0, (Number(inv.grand_total) || 0) - (Number(inv.amount_paid) || 0))),
      public_token: inv.public_token || "",
      public_link_enabled: !!inv.public_link_enabled,
    })),
    transactions: (transactions || []).map((t) => ({
      id: t.id,
      amount: Number(t.amount) || 0,
      payment_method: t.payment_method || "",
      transaction_date: t.transaction_date || "",
      reference_number: t.reference_number || "",
    })),
  };
}

// Verify that a user is a member of (or owner of) a workspace.
export async function verifyWorkspaceMembership(userId: string, workspaceId: string): Promise<boolean> {
  const { data: memberships } = await supabaseAdmin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .limit(1);
  if (memberships && memberships.length > 0) return true;

  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .single();
  if (ws && ws.owner_user_id === userId) return true;

  return false;
}