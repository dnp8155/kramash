// A fingerprint of what a portal shows, to tell whether anything changed since it was loaded. Key order doesn't
// matter, and values that change on their own (view counters, "viewed at" times, one-off flags) are left out, so
// only a real change by the business (a payment, a date, a progress step…) counts.
const VOLATILE = /(view_count|viewed_at|last_seen|seen_at|generated_at|fetched_at|server_time|auto_linked|session_token|expires_in)$/i;

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (VOLATILE.test(key)) continue;
      out[key] = normalize(value[key]);
    }
    return out;
  }
  return value;
}

export function portalSignature(data) {
  try { return JSON.stringify(normalize(data ?? null)); } catch { return ""; }
}
