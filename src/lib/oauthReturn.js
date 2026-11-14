// Connecting Instagram or Gmail takes the person to a sign-in page (Facebook, Instagram, Google) and a redirect brings
// them back. The browser's history then reads [ …, app page, sign-in pages…, app page again ], so pressing Back from the
// page they return to (Android, iPhone, desktop) used to land on the Facebook/Instagram/Google sign-in screen.
//
// Fix: when leaving, remember how long the history was. On return, jump back over the sign-in pages to the page they left
// from (the same address) and show the result there. Back from that page then goes where it should: the page before.
// If anything about that does not add up (a different page, a long gap, a capped history) nothing is jumped and the
// result is simply shown where they landed, as before.

const LEAVE = "kramasha-oauth-leave";
const RESULT = "kramasha-oauth-result";
const LEAVE_FRESH_MS = 30 * 60 * 1000; // a sign-in left open for longer than this is treated as abandoned
const RESULT_FRESH_MS = 2 * 60 * 1000;
const MAX_STEPS = 25;

const read = (key) => { try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: no jump back */ } };
const clear = (key) => { try { sessionStorage.removeItem(key); } catch { /* ignore */ } };

// Call instead of setting window.location.href when sending the person to a sign-in page.
export function leaveForOAuth(url) {
  write(LEAVE, { len: window.history.length, at: Date.now(), path: window.location.pathname });
  window.location.href = url;
}

// Call on the page they come back to (the one that reads ?instagram= / ?gmail=). Returns true when it has started the
// jump back; the result is then picked up by the page they land on (takeOAuthResult). Returns false when it did not
// jump: show the result right here.
export function jumpBackAfterOAuth() {
  const leave = read(LEAVE);
  clear(LEAVE);
  if (!leave || Date.now() - leave.at > LEAVE_FRESH_MS || leave.path !== window.location.pathname) return false;
  const steps = window.history.length - leave.len; // pages added since they left: the sign-in pages plus this one
  if (!(steps >= 1 && steps <= MAX_STEPS)) return false;
  write(RESULT, { search: window.location.search, at: Date.now() });
  window.history.go(-steps);
  return true;
}

// The saved result for `kind` ("instagram" or "gmail") as a query string, once, or null.
export function takeOAuthResult(kind) {
  const saved = read(RESULT);
  if (!saved) return null;
  if (Date.now() - saved.at > RESULT_FRESH_MS) { clear(RESULT); return null; }
  if (!new URLSearchParams(saved.search || "").get(kind)) return null;
  clear(RESULT);
  return saved.search;
}

// A page restored from the browser's back/forward cache is not set up again, so it asks to be told when that happens.
export function onOAuthPageShow(callback) {
  const handler = (e) => { if (e.persisted) callback(); };
  window.addEventListener("pageshow", handler);
  return () => window.removeEventListener("pageshow", handler);
}
