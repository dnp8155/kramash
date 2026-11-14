// Remembers how this browser last signed in ("google" or "email") so the login and sign-up pages can tag it.
// Google goes through a redirect, so the click is only "pending" until Supabase reports the sign-in.
const KEY = "kramasha:last-login-method";
const PENDING_KEY = "kramasha:pending-login-method";
// A Google click that never came back (closed tab, cancelled consent) must not be claimed by a later sign-in.
const PENDING_TTL_MS = 10 * 60 * 1000;

export function getLastLoginMethod() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setLastLoginMethod(method) {
  try { localStorage.setItem(KEY, method); } catch { /* storage blocked — the tag is optional */ }
}

// An email/password sign-in settles the question itself, so any unfinished Google click is dropped.
export function setEmailLoginMethod() {
  clearPendingLoginMethod();
  setLastLoginMethod("email");
}

export function setPendingLoginMethod(method) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ method, at: Date.now() })); } catch { /* optional */ }
}

function clearPendingLoginMethod() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* optional */ }
}

// How the access token says this session was started ("oauth", "password", "otp"…), newest entry first.
function sessionMethod(session) {
  try {
    const payload = session?.access_token?.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json?.amr?.[0]?.method || null;
  } catch { return null; }
}

// Called when a sign-in lands: turns the pending method into the remembered one — but only if this session
// really came from it. SIGNED_IN also fires when an existing session is restored (tab refocus), and that
// must never be credited to a stale Google click.
export function commitPendingLoginMethod(session) {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    const { method, at } = JSON.parse(raw);
    if (!method || Date.now() - at > PENDING_TTL_MS) return;
    const actual = sessionMethod(session);
    if (actual && (actual === "oauth") !== (method !== "email")) return;
    setLastLoginMethod(method);
  } catch { /* optional */ }
}
