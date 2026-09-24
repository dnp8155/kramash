// Direct Edge Function caller — bypasses supabase.functions.invoke which
// throws "Failed to send a request to the Edge Function" in some environments.
// Uses fetch() directly to the Supabase Edge Function URL with the anon key.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseConfig";

const EDGE_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * Invoke a Supabase Edge Function via direct fetch.
 * Returns the parsed JSON response, or throws { message, data: { error } } on failure.
 */
export async function invokeEdgeFunction(name, payload) {
  const resp = await fetch(`${EDGE_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload || {}),
  });

  const text = await resp.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: text }; }

  if (!resp.ok || body?.error) {
    const message = body?.error || `Edge Function ${name} failed (${resp.status})`;
    throw { message, data: { error: message } };
  }

  return body;
}