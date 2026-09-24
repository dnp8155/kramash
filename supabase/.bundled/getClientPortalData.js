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

// supabase/functions/_shared/clientPortalData.ts
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
async function buildClientPortalData(clientId, workspaceId, options = {}) {
  const emailOverride = options.emailOverride || null;
  const nameFallback = options.clientNameFallback || "";
  const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).single();
  const currency = workspace?.currency || "INR";
  const { data: clientRecord } = await supabaseAdmin.from("clients").select("*").eq("id", clientId).single();
  const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", workspaceId).eq("client_id", clientId).order("start_date", { ascending: false }).limit(200);
  const { data: quotations } = await supabaseAdmin.from("quotations").select("*").eq("workspace_id", workspaceId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(200);
  const { data: invoices } = await supabaseAdmin.from("invoices").select("*").eq("workspace_id", workspaceId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(200);
  const { data: transactions } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspaceId).eq("client_id", clientId).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(500);
  const totalQuoted = (quotations || []).filter((q) => q.status === "accepted").reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);
  const totalInvoiced = (invoices || []).reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const totalPaid = (transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const balanceDue = Math.max(0, round2(totalInvoiced - totalPaid));
  return {
    client: {
      id: clientId,
      name: clientRecord?.name || nameFallback,
      email: emailOverride || clientRecord?.email || ""
    },
    workspace: {
      id: workspaceId,
      name: workspace?.name || "",
      logo: workspace?.logo || "",
      phone: workspace?.phone || "",
      email: workspace?.email || "",
      currency
    },
    summary: {
      totalEvents: (events || []).length,
      totalQuoted: round2(totalQuoted),
      totalInvoiced: round2(totalInvoiced),
      totalPaid: round2(totalPaid),
      balanceDue: round2(balanceDue)
    },
    events: (events || []).map((e) => ({
      id: e.id,
      title: e.title || "",
      event_type: e.event_type || "",
      start_date: e.start_date || "",
      end_date: e.end_date || "",
      venue: e.venue || "",
      status: e.status || "upcoming",
      contract_value: Number(e.contract_value) || 0
    })),
    quotations: (quotations || []).map((q) => ({
      id: q.id,
      quotation_number: q.quotation_number || "",
      quotation_date: q.quotation_date || "",
      status: q.status || "draft",
      grand_total: Number(q.grand_total) || 0,
      public_token: q.public_token || "",
      public_link_enabled: !!q.public_link_enabled,
      project_title: q.project_title || ""
    })),
    invoices: (invoices || []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number || "",
      invoice_date: inv.invoice_date || "",
      due_date: inv.due_date || "",
      status: inv.status || "draft",
      grand_total: Number(inv.grand_total) || 0,
      amount_paid: Number(inv.amount_paid) || 0,
      balance_due: Number(inv.balance_due) || 0,
      public_token: inv.public_token || "",
      public_link_enabled: !!inv.public_link_enabled
    })),
    transactions: (transactions || []).map((t) => ({
      id: t.id,
      amount: Number(t.amount) || 0,
      payment_method: t.payment_method || "",
      transaction_date: t.transaction_date || "",
      reference_number: t.reference_number || ""
    }))
  };
}

// supabase/functions/getClientPortalData/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();
    let clientId = profile?.linked_client_id || "";
    let workspaceId = profile?.linked_workspace_id || "";
    let wasAutoLinked = false;
    if (profile?.role !== "client" || !clientId) {
      const { data: clients } = await supabaseAdmin.from("clients").select("*").eq("email", user.email).order("created_at", { ascending: false }).limit(10);
      if (clients && clients.length > 0) {
        clientId = clients[0].id;
        workspaceId = clients[0].workspace_id || workspaceId;
        try {
          await supabaseAdmin.from("profiles").update({
            role: "client",
            linked_client_id: clientId,
            linked_workspace_id: workspaceId
          }).eq("id", user.id);
          wasAutoLinked = true;
        } catch (e) {
        }
      }
    }
    if (!clientId || !workspaceId) {
      return Response.json({
        error: "Your account is not linked to any client record. Please contact your service provider to invite you to the portal."
      }, { status: 404 });
    }
    const data = await buildClientPortalData(clientId, workspaceId, {
      emailOverride: user.email,
      clientNameFallback: user.user_metadata?.full_name || user.email
    });
    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
