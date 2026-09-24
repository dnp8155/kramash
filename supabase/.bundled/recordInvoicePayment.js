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

// supabase/functions/recordInvoicePayment/index.ts
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
      const { data: existing } = await supabaseAdmin.from("financial_transactions").select("id").eq("workspace_id", workspace_id).eq("invoice_id", invoice_id).eq("reference_number", String(reference_number).trim()).eq("status", "ACTIVE").limit(5);
      if (existing && existing.length > 0) {
        return Response.json({ error: "DUPLICATE_PAYMENT", message: "A payment with this reference number already exists for this invoice." }, { status: 409 });
      }
    }
    const { data: existingTxns } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspace_id).eq("invoice_id", invoice_id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(200);
    const currentPaid = round2((existingTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
    const grandTotal = Number(inv.grand_total) || 0;
    const newPaidAmount = round2(currentPaid + amt);
    if (newPaidAmount > grandTotal + 0.01) {
      return Response.json({
        error: "OVERPAYMENT_PREVENTED",
        message: `Payment would exceed invoice total. Current paid: ${currentPaid}, Invoice total: ${grandTotal}, Attempted: ${amt}`,
        current_paid: currentPaid,
        balance: round2(grandTotal - currentPaid)
      }, { status: 400 });
    }
    const { data: txn, error: txnErr } = await supabaseAdmin.from("financial_transactions").insert({
      workspace_id,
      financial_year_id,
      event_id: inv.event_id || null,
      invoice_id,
      client_id: inv.client_id || null,
      milestone_id: inv.milestone_id || null,
      transaction_type: "CLIENT_RECEIPT",
      amount: amt,
      payment_method: payment_method || "UPI",
      transaction_date,
      reference_number: (reference_number || "").trim(),
      notes: (notes || "").trim(),
      status: "ACTIVE"
    }).select("*").single();
    if (txnErr) throw txnErr;
    const balanceDue = round2(Math.max(0, grandTotal - newPaidAmount));
    const newStatus = deriveInvoiceStatus({ grand_total: grandTotal, amount_paid: newPaidAmount, due_date: inv.due_date, status: inv.status });
    await supabaseAdmin.from("invoices").update({ amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus }).eq("id", invoice_id);
    if (inv.milestone_id) {
      try {
        const { data: mTxns } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspace_id).eq("milestone_id", inv.milestone_id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").limit(200);
        const milestonePaid = round2((mTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const { data: milestone } = await supabaseAdmin.from("payment_milestones").select("*").eq("id", inv.milestone_id).single();
        if (milestone) {
          const mDue = Number(milestone.due_amount) || 0;
          const mStatus = computeMilestoneStatus(milestonePaid, mDue, milestone.due_date || "");
          await supabaseAdmin.from("payment_milestones").update({ paid_amount: milestonePaid, status: mStatus }).eq("id", inv.milestone_id);
        }
      } catch {
      }
    }
    return Response.json({ success: true, transaction_id: txn.id, invoice_id, amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
