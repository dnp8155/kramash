import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English.",
  hi: "हिंदी में उत्तर दें (Respond in Hindi).",
  gu: "ગુજરાતીમાં જવાબ આપો (Respond in Gujarati).",
};

function money(n, currency = "INR") {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  return `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = (body?.message || "").toString().trim();
    const language = ["en", "hi", "gu"].includes(body?.language) ? body.language : "en";
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const fileUrls = Array.isArray(body?.file_urls) ? body.file_urls.filter(Boolean) : [];

    if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });
    if (message.length > 2000) return Response.json({ error: 'Message too long' }, { status: 400 });

    const workspaceId = user?.data?.active_workspace_id;
    if (!workspaceId) {
      return Response.json({ reply: "Please complete your workspace setup first, then I can help analyze your business data." });
    }

    // Fetch workspace data (service role bypasses RLS; filter explicitly by workspace_id)
    const [workspace, events, clients, teamMembers, teamRoles, assignments, transactions, quotations] = await Promise.all([
      base44.asServiceRole.entities.Workspace.filter({ id: workspaceId }, "-created_date", 1),
      base44.asServiceRole.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 100),
      base44.asServiceRole.entities.Client.filter({ workspace_id: workspaceId }, "name", 200),
      base44.asServiceRole.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200),
      base44.asServiceRole.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 50),
      base44.asServiceRole.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 300),
      base44.asServiceRole.entities.FinancialTransaction.filter({ workspace_id: workspaceId }, "-transaction_date", 300),
      base44.asServiceRole.entities.Quotation.filter({ workspace_id: workspaceId }, "-quotation_date", 50),
    ]);

    const ws = workspace?.[0] || {};
    const currency = ws.currency || "INR";

    // Build lookup maps
    const clientMap = {};
    (clients || []).forEach((c) => { clientMap[c.id] = c; });
    const memberMap = {};
    (teamMembers || []).forEach((m) => { memberMap[m.id] = m; });
    const roleMap = {};
    (teamRoles || []).forEach((r) => { roleMap[r.id] = r; });
    const eventMap = {};
    (events || []).forEach((e) => { eventMap[e.id] = e; });

    // Compute team payment dues
    // For each assignment: agreed_rate - sum of TEAM_PAYMENT transactions for that assignment
    const paymentsByAssignment = {};
    (transactions || []).forEach((t) => {
      if (t.transaction_type === "TEAM_PAYMENT" && t.team_assignment_id && t.status !== "VOID") {
        paymentsByAssignment[t.team_assignment_id] = (paymentsByAssignment[t.team_assignment_id] || 0) + (t.amount || 0);
        }
    });

    const assignmentLines = (assignments || [])
      .filter((a) => a.assignment_status !== "removed")
      .map((a) => {
        const member = memberMap[a.team_member_id] || {};
        const role = roleMap[a.role_id] || {};
        const ev = eventMap[a.event_id] || {};
        const paid = paymentsByAssignment[a.id] || 0;
        const due = Math.max(0, (a.agreed_rate || 0) - paid);
        return `  - Assignment ${a.id}: ${member.name || "Unknown"} | Event: ${ev.title || "—"} | Role: ${role.name || a.role_name_snapshot || "—"} | Agreed: ${money(a.agreed_rate, currency)} | Paid: ${money(paid, currency)} | DUE: ${money(due, currency)}`;
      }).join("\n");

    // Compute client payment status
    // CLIENT_RECEIPT per client, and contract_value per event
    const receiptsByClient = {};
    (transactions || []).forEach((t) => {
      if (t.transaction_type === "CLIENT_RECEIPT" && t.client_id && t.status !== "VOID") {
        receiptsByClient[t.client_id] = (receiptsByClient[t.client_id] || 0) + (t.amount || 0);
      }
    });
    const contractByClient = {};
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

    // Expenses
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

    const conversation = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = `You are KRAMAS Assistant, an intelligent AI bot inside a service-business management SaaS app (KRAMAS) used by photographers, event managers, and production teams in India.

You have access to the user's REAL workspace data below. Analyze it carefully and answer questions accurately using this data. For payment-related questions (e.g., "kisko kitna payment dena hai"), compute dues from the TEAM ASSIGNMENTS section (DUE = Agreed - Paid) and give exact amounts and names. For client balance questions, use the CLIENTS section (Balance = Contract - Received).

Be friendly, practical, and precise. When listing amounts, use proper currency formatting. If data is empty, say so honestly. Keep replies concise but complete — use short bullet points when listing multiple items. Do NOT make up data that isn't in the context.

${langInstruction}

--- WORKSPACE DATA ---
${dataContext}
--- END DATA ---

${conversation ? `Conversation so far:\n${conversation}\n` : ""}
User: ${message}

Assistant:`;

    const llmInput = {
      prompt,
    };
    if (fileUrls.length > 0) {
      llmInput.file_urls = fileUrls;
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(llmInput);

    const reply = typeof result === "string" ? result : result?.response || result?.output || JSON.stringify(result);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}