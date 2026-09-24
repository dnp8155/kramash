// Direct Edge Function caller — bypasses supabase.functions.invoke which
// throws "Failed to send a request to the Edge Function" in some environments.
// Uses fetch() directly to the Supabase Edge Function URL.
// Passes the user's Supabase session token (if logged in) for authenticated calls,
// falls back to the anon key for public/unauthenticated calls.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseConfig";
import supabase from "@/lib/supabaseClient";

const EDGE_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * Invoke a Supabase Edge Function via direct fetch.
 * Returns the parsed JSON response, or throws { message, data: { error } } on failure.
 */
export async function invokeEdgeFunction(name, payload) {
  // Get the current user's session token for authenticated calls
  let authToken = SUPABASE_ANON_KEY;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authToken = session.access_token;
    }
  } catch { /* not logged in — use anon key */ }

  const resp = await fetch(`${EDGE_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload || {}),
  });

  const text = await resp.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: text }; }

  if (!resp.ok || body?.error) {
    const message = body?.error || `Edge Function ${name} failed (${resp.status})`;
    const err = { message, data: { error: message } };
    if (resp.status) err.status = resp.status;
    throw err;
  }

  return body;
}