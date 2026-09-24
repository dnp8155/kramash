// supabase/functions/_shared/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders
      });
    }
    const response = await handler(req);
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
var supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
async function getUserFromRequest(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// supabase/functions/_shared/planEngine.ts
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
}

// supabase/functions/_shared/helpers.ts
function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
function deriveInvoiceStatus(invoice) {
  const total = Number(invoice?.grand_total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  const balance = round2(Math.max(0, total - paid));
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const dueDate = invoice?.due_date || "";
  const currentStatus = invoice?.status || "draft";
  if (currentStatus === "cancelled") return "cancelled";
  if (currentStatus === "draft") return "draft";
  if (balance <= 0 && total > 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";
  if (dueDate && dueDate < today) return "overdue";
  return currentStatus === "sent" ? "sent" : "due";
}

// supabase/functions/_shared/transactionReconcile.ts
function computeMilestoneStatus(paid, due, dueDate) {
  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}
async function reconcileInvoice(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return null;
  const { data: inv } = await supabaseAdmin.from("invoices").select("*").eq("id", invoiceId).single();
  if (!inv || inv.workspace_id !== workspaceId) return null;
  const { data: txns } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspaceId).eq("invoice_id", invoiceId).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(200);
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const grandTotal = Number(inv.grand_total) || 0;
  const balance = round2(Math.max(0, grandTotal - paid));
  const status = deriveInvoiceStatus({ ...inv, amount_paid: paid });
  const { data: updated } = await supabaseAdmin.from("invoices").update({ amount_paid: paid, balance_due: balance, status }).eq("id", invoiceId).select("*").single();
  return updated;
}
async function reconcileMilestone(workspaceId, milestoneId) {
  if (!workspaceId || !milestoneId) return null;
  const { data: m } = await supabaseAdmin.from("payment_milestones").select("*").eq("id", milestoneId).single();
  if (!m || m.workspace_id !== workspaceId) return null;
  const { data: txns } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspaceId).eq("milestone_id", milestoneId).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(200);
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const due = Number(m.due_amount) || 0;
  const status = computeMilestoneStatus(paid, due, m.due_date || "");
  const { data: updated } = await supabaseAdmin.from("payment_milestones").update({ paid_amount: paid, status }).eq("id", milestoneId).select("*").single();
  return updated;
}
async function reconcileAfterTransactionChange(workspaceId, invoiceId, milestoneId) {
  const results = {};
  if (invoiceId) {
    try {
      results.invoice = await reconcileInvoice(workspaceId, invoiceId);
    } catch {
    }
  }
  if (milestoneId) {
    try {
      results.milestone = await reconcileMilestone(workspaceId, milestoneId);
    } catch {
    }
  }
  return results;
}

// supabase/functions/editTransaction/index.ts
Deno.serve(withCors(async (req) => {
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
        const { data: otherTxns } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspace_id).eq("invoice_id", txn.invoice_id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").limit(200);
        const otherPaid = round2((otherTxns || []).filter((t) => t.id !== transaction_id).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const newTotal = round2(otherPaid + amt);
        if (newTotal > grandTotal + 0.01) {
          return Response.json({
            error: "OVERPAYMENT_PREVENTED",
            message: `Edited amount would exceed invoice total.`,
            current_other_paid: otherPaid,
            balance: round2(grandTotal - otherPaid)
          }, { status: 400 });
        }
      }
    }
    const { data: updated, error } = await supabaseAdmin.from("financial_transactions").update({
      amount: amt,
      payment_method: payment_method || txn.payment_method || "Cash",
      transaction_date,
      reference_number: (reference_number || "").trim(),
      notes: (notes || "").trim(),
      financial_year_id: financial_year_id || txn.financial_year_id || ""
    }).eq("id", transaction_id).select("*").single();
    if (error) throw error;
    const invoiceId = txn.invoice_id || "";
    const milestoneId = txn.milestone_id || "";
    const reconciled = await reconcileAfterTransactionChange(workspace_id, invoiceId, milestoneId);
    return Response.json({
      success: true,
      transaction: updated,
      invoice: reconciled.invoice ? { id: reconciled.invoice.id, amount_paid: reconciled.invoice.amount_paid, balance_due: reconciled.invoice.balance_due, status: reconciled.invoice.status } : null,
      milestone: reconciled.milestone ? { id: reconciled.milestone.id, paid_amount: reconciled.milestone.paid_amount, status: reconciled.milestone.status } : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
