import { withCors } from "../_shared/cors.ts";
// agentChat — AI assistant with real workspace data context.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in English.",
  hi: "हिंदी में उत्तर दें (Respond in Hindi).",
  gu: "ગુજરાતીમાં જવાબ આપો (Respond in Gujarati).",
};

function money(n: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  return `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
}

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const message = (body?.message || "").toString().trim();
    const language = ["en", "hi", "gu"].includes(body?.language) ? body.language : "en";
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];

    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });
    if (message.length > 2000) return Response.json({ error: "Message too long" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();
    const workspaceId = body?.workspace_id || profile?.active_workspace_id;
    if (!workspaceId) {
      return Response.json({ reply: "Please complete your workspace setup first, then I can help analyze your business data." });
    }

    const { data: wsList } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).limit(1);
    const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", workspaceId).order("start_date", { ascending: false }).limit(100);
    const { data: clients } = await supabaseAdmin.from("clients").select("*").eq("workspace_id", workspaceId).order("name", { ascending: true }).limit(200);
    const { data: teamMembers } = await supabaseAdmin.from("team_members").select("*").eq("workspace_id", workspaceId).order("name", { ascending: true }).limit(200);
    const { data: teamRoles } = await supabaseAdmin.from("team_roles").select("*").eq("workspace_id", workspaceId).order("name", { ascending: true }).limit(50);
    const { data: assignments } = await supabaseAdmin.from("event_team_assignments").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(300);
    const { data: transactions } = await supabaseAdmin.from("financial_transactions").select("*").eq("workspace_id", workspaceId).order("transaction_date", { ascending: false }).limit(300);
    const { data: quotations } = await supabaseAdmin.from("quotations").select("*").eq("workspace_id", workspaceId).order("quotation_date", { ascending: false }).limit(50);

    const ws = wsList?.[0] || {};
    const currency = ws.currency || "INR";

    const clientMap: Record<string, any> = {};
    (clients || []).forEach((c) => { clientMap[c.id] = c; });
    const memberMap: Record<string, any> = {};
    (teamMembers || []).forEach((m) => { memberMap[m.id] = m; });
    const roleMap: Record<string, any> = {};
    (teamRoles || []).forEach((r) => { roleMap[r.id] = r; });
    const eventMap: Record<string, any> = {};
    (events || []).forEach((e) => { eventMap[e.id] = e; });

    const paymentsByAssignment: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      if (t.transaction_type === "TEAM_PAYMENT" && t.team_assignment_id && t.status !== "VOID") {
        paymentsByAssignment[t.team_assignment_id] = (paymentsByAssignment[t.team_assignment_id] || 0) + (t.amount || 0);
      }
    });

    const assignmentLines = (assignments || []).filter((a) => a.assignment_status !== "removed").map((a) => {
      const member = memberMap[a.team_member_id] || {};
      const role = roleMap[a.role_id] || {};
      const ev = eventMap[a.event_id] || {};
      const paid = paymentsByAssignment[a.id] || 0;
      const due = Math.max(0, (a.agreed_rate || 0) - paid);
      return `  - Assignment ${a.id}: ${member.name || "Unknown"} | Event: ${ev.title || "—"} | Role: ${role.name || a.role_name_snapshot || "—"} | Agreed: ${money(a.agreed_rate, currency)} | Paid: ${money(paid, currency)} | DUE: ${money(due, currency)}`;
    }).join("\n");

    const receiptsByClient: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      if (t.transaction_type === "CLIENT_RECEIPT" && t.client_id && t.status !== "VOID") {
        receiptsByClient[t.client_id] = (receiptsByClient[t.client_id] || 0) + (t.amount || 0);
      }
    });
    const contractByClient: Record<string, number> = {};
    (events || []).forEach((e) => {
      if (e.client_id) contractByClient[e.client_id] = (contractByClient[e.client_id] || 0) + (e.contract_value || 0);
    });

    const clientLines = (clients || []).map((c) => {
      const contract = contractByClient[c.id] || 0;
      const received = receiptsByClient[c.id] || 0;
      const balance = contract - received;
      return `  - ${c.name} (id:${c.id}) | Phone: ${c.phone || "—"} | Contract: ${money(contract, currency)} | Received: ${money(received, currency)} | Balance: ${money(balance, currency)}`;
    }).join("\n");

    const eventLines = (events || []).map((e) => {
      const c = clientMap[e.client_id] || {};
      return `  - ${e.title} (id:${e.id}) | Status: ${e.status} | Start: ${e.start_date || "—"} | Client: ${c.name || "—"} | Venue: ${e.venue || "—"} | Contract: ${money(e.contract_value, currency)}`;
    }).join("\n");

    const memberLines = (teamMembers || []).map((m) => {
      const role = roleMap[m.role_id] || {};
      return `  - ${m.name} (id:${m.id}) | Profession: ${m.profession || "—"} | Role: ${role.name || "—"} | Status: ${m.status}`;
    }).join("\n");

    const expenses = (transactions || []).filter((t) => t.transaction_type === "BUSINESS_EXPENSE" && t.status !== "VOID");
    const totalExpense = expenses.reduce((s, t) => s + (t.amount || 0), 0);

    const dataContext = `WORKSPACE: ${ws.name || "—"} | Category: ${ws.business_category || "—"} | Currency: ${currency}

EVENTS/PROJECTS (${(events || []).length}):
${eventLines || "  (none)"}

CLIENTS (${(clients || []).length}):
${clientLines || "  (none)"}

TEAM MEMBERS (${(teamMembers || []).length}):
${memberLines || "  (none)"}

TEAM ASSIGNMENTS & PAYMENT DUES:
${assignmentLines || "  (none)"}

BUSINESS EXPENSES: ${money(totalExpense, currency)} across ${expenses.length} transactions
QUOTATIONS: ${(quotations || []).length} total`;

    const langInstruction = LANGUAGE_INSTRUCTIONS[language];
    const conversation = history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

    const prompt = `You are Kramasha Assistant, an intelligent AI bot inside a service-business management SaaS app (Kramasha) used by photographers, event managers, and production teams in India.

You have access to the user's REAL workspace data below. Your job is to analyze this data CAREFULLY and answer questions with EXACT, ACCURATE figures derived only from the data provided.

CRITICAL RULES:
1. ALWAYS compute answers from the data below — never guess, never approximate, never use outside knowledge for amounts or names.
2. For team payment dues: DUE = Agreed rate − Paid amount (per assignment). List each member name, the event, and the exact due amount. Only include assignments where DUE > 0.
3. For client balances: Balance = Total Contract − Total Received (per client).
4. For upcoming events: list events whose start_date is today or later, with their date, client name, and contract value.
5. When the user asks "kisko kitna payment dena hai" or similar, ALWAYS give the exact name and exact amount.
6. If the data section is empty or has no relevant records, say so honestly.
7. Format money with the correct currency symbol (₹ for INR). Use Indian number formatting.
8. Keep replies concise but complete — use short bullet points when listing multiple items.

${langInstruction}

--- WORKSPACE DATA ---
${dataContext}
--- END DATA ---

${conversation ? `Conversation so far:\n${conversation}\n` : ""}
User: ${message}

Assistant:`;

    // Call OpenAI directly (requires OPENAI_API_KEY env var)
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return Response.json({ reply: "AI assistant is not configured yet. Please set OPENAI_API_KEY in Supabase Edge Function secrets to enable the assistant." });
    }

    const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000
      })
    });

    let reply = "Sorry, I couldn't generate a response right now.";
    if (llmRes.ok) {
      const llmData = await llmRes.json();
      reply = llmData?.choices?.[0]?.message?.content || reply;
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message || "Failed to generate response" }, { status: 500 });
  }
}));