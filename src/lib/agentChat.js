// Client-side Agent Chat — replaces the backend agentChat function.
// Fetches workspace data directly from Supabase (via base44 entities)
// and calls InvokeLLM client-side. This avoids the broken backend
// function path that used asServiceRole (which doesn't work after
// the Supabase migration).

import { base44 } from "@/api/base44Client";
import { GEMINI_API_KEY, GEMINI_MODEL, hasGeminiKey } from "@/lib/llmConfig";

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English.",
  hi: "हिंदी में उत्तर दें (Respond in Hindi).",
  gu: "ગુજરાતીમાં જવાબ આપો (Respond in Gujarati).",
};

function money(n, currency = "INR") {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${sym}${Number(n || 0).toLocaleString("en-IN")}`;
}

export async function agentChat({ message, language = "en", workspaceId, history = [] }) {
  if (!message || !message.trim()) {
    return { reply: "Please ask me something." };
  }
  if (message.length > 2000) {
    return { reply: "Your message is too long. Please keep it under 2000 characters." };
  }
  if (!workspaceId) {
    return { reply: "Please complete your workspace setup first, then I can help analyze your business data." };
  }

  // Fetch workspace data directly from Supabase via client-side entities
  const [
    workspaceList,
    events,
    clients,
    teamMembers,
    teamRoles,
    assignments,
    transactions,
    quotations,
  ] = await Promise.all([
    base44.entities.Workspace.filter({ id: workspaceId }),
    base44.entities.Event.filter({ workspace_id: workspaceId }),
    base44.entities.Client.filter({ workspace_id: workspaceId }),
    base44.entities.TeamMember.filter({ workspace_id: workspaceId }),
    base44.entities.TeamRole.filter({ workspace_id: workspaceId }),
    base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }),
    base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId }),
    base44.entities.Quotation.filter({ workspace_id: workspaceId }),
  ]);

  const ws = workspaceList?.[0] || {};
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
      return `  - ${member.name || "Unknown"} | Event: ${ev.title || "—"} | Role: ${role.name || a.role_name_snapshot || "—"} | Agreed: ${money(a.agreed_rate, currency)} | Paid: ${money(paid, currency)} | DUE: ${money(due, currency)}`;
    }).join("\n");

  // Compute client payment status
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
    return `  - ${c.name} | Phone: ${c.phone || "—"} | Contract: ${money(contract, currency)} | Received: ${money(received, currency)} | Balance: ${money(balance, currency)}`;
  }).join("\n");

  const eventLines = (events || []).map((e) => {
    const c = clientMap[e.client_id] || {};
    return `  - ${e.title} | Status: ${e.status} | Start: ${e.start_date || "—"} | Client: ${c.name || "—"} | Venue: ${e.venue || "—"} | Contract: ${money(e.contract_value, currency)}`;
  }).join("\n");

  const memberLines = (teamMembers || []).map((m) => {
    const role = roleMap[m.role_id] || {};
    return `  - ${m.name} | Profession: ${m.profession || "—"} | Role: ${role.name || "—"} | Status: ${m.status}`;
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

  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;

  const conversation = (history || [])
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are Kramasha Assistant, an intelligent AI bot inside a service-business management SaaS app (Kramasha) used by photographers, event managers, and production teams in India.

You have access to the user's REAL workspace data below. Your job is to analyze this data CAREFULLY and answer questions with EXACT, ACCURATE figures derived only from the data provided.

CRITICAL RULES:
1. ALWAYS compute answers from the data below — never guess, never approximate, never use outside knowledge for amounts or names.
2. For team payment dues: DUE = Agreed rate − Paid amount (per assignment). List each member name, the event, and the exact due amount. Only include assignments where DUE > 0.
3. For client balances: Balance = Total Contract − Total Received (per client). Use the CLIENTS section which already has Contract, Received, and Balance computed.
4. For upcoming events: list events whose start_date is today or later, with their date, client name, and contract value.
5. When the user asks "kisko kitna payment dena hai" or similar, ALWAYS give the exact name and exact amount — do not round or skip.
6. If the data section is empty or has no relevant records, say so honestly (e.g., "No pending team payments.").
7. Format money with the correct currency symbol (₹ for INR). Use Indian number formatting (e.g., ₹1,05,000).
8. Keep replies concise but complete — use short bullet points when listing multiple items. Do NOT make up data that isn't in the context.

${langInstruction}

--- WORKSPACE DATA ---
${dataContext}
--- END DATA ---

${conversation ? `Conversation so far:\n${conversation}\n` : ""}
User: ${message}

Assistant:`;

  if (!hasGeminiKey()) {
    return {
      reply: "AI Assistant अभी सेटअप बाकी है। कृपया src/lib/llmConfig.js में अपनी Google Gemini API key पेस्ट करें (aistudio.google.com/apikey पर फ्री key बनाएं)।",
    };
  }

  const reply = await callGemini(prompt);

  return { reply };
}

// Direct Google Gemini API call — no Base44 dependency.
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "Sorry, I couldn't generate a response.";
}