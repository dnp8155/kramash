// Agent Chat — thin calls to the agentChat Edge Function. The function reads the workspace data, keeps the saved
// conversation, enforces the daily message cap and talks to Gemini, so the API key (GEMINI_API_KEY secret in
// Supabase) and the history stay on the server.

import { base44 } from "@/api/base44Client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseConfig";
import supabase from "@/lib/supabaseClient";

export async function agentChat({ message, language = "en", workspaceId }) {
  const res = await base44.functions.invoke("agentChat", {
    message,
    language,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
  });
  return { reply: res?.reply || "", limitReached: Boolean(res?.limit_reached), used: res?.used, limit: res?.limit };
}

// The saved conversation, oldest first, with how many messages were used today: { messages: [{ role, content }], used, limit }.
export async function loadAgentChat(workspaceId) {
  const res = await base44.functions.invoke("agentChat", { action: "history", ...(workspaceId ? { workspace_id: workspaceId } : {}) });
  return { messages: Array.isArray(res?.messages) ? res.messages : [], used: res?.used, limit: res?.limit };
}

export async function clearAgentHistory(workspaceId) {
  await base44.functions.invoke("agentChat", { action: "clear", ...(workspaceId ? { workspace_id: workspaceId } : {}) });
}

// Same question, but the answer arrives as it is written: onStep({ id, label }) for each thing the assistant is doing
// (reading data, calculating, looking up help, writing), onDelta(text) for pieces of the answer, onReset() when the
// text so far should be thrown away. Resolves like agentChat(). If streaming is not possible it falls back to agentChat().
export async function agentChatStream({ message, language = "en", workspaceId, onStep, onDelta, onReset }) {
  let started = false;
  try {
    let token = SUPABASE_ANON_KEY;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch { /* not signed in: the function will say so */ }
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/agentChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ message, language, stream: true, ...(workspaceId ? { workspace_id: workspaceId } : {}) }),
    });
    const type = resp.headers.get("content-type") || "";
    // A plain JSON answer (daily limit reached, setup missing, an error) comes back the old way.
    if (!type.includes("text/event-stream")) {
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || body?.error) throw new Error(body?.error || `Failed (${resp.status})`);
      return { reply: body?.reply || "", limitReached: Boolean(body?.limit_reached), used: body?.used, limit: body?.limit };
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let reply = null;
    let usage = {};
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 2);
        if (!block.startsWith("data:")) continue;
        let ev;
        try { ev = JSON.parse(block.slice(5)); } catch { continue; }
        started = true;
        if (ev.type === "step") onStep?.({ id: ev.id, label: ev.label });
        else if (ev.type === "delta") onDelta?.(ev.text);
        else if (ev.type === "reset") onReset?.();
        else if (ev.type === "done") { reply = ev.reply || ""; usage = { used: ev.used, limit: ev.limit }; }
        else if (ev.type === "error") throw new Error(ev.message || "Failed");
      }
    }
    if (reply === null) throw new Error("The answer was cut off");
    return { reply, limitReached: false, ...usage };
  } catch (e) {
    // The browser could not open the stream at all (offline proxy, blocked): ask the normal way instead. Any other
    // failure is shown as a failure, so one question never counts twice.
    if (!started && e instanceof TypeError) return agentChat({ message, language, workspaceId });
    throw e;
  }
}

