// Starts a public page's data request the moment the app boots, in parallel with downloading the page's code
// (instead of after it). The page then picks up that same request; if anything differs (another payload, a
// password typed in, too old), it simply makes its own request as before, so this can only make pages faster.
//
// Covered: quotation (/q), project portal (/portal), track (/track), review link (/review), job sheet
// (/job-sheet), invoice (/invoice), public profile + inquiry (/p/<slug>, /p/<slug>/inquiry), client portal
// (/client-portal) and team portal (/team-portal).
import { invokeEdgeFunction } from "@/lib/edgeFunction";
import { getPortalSession } from "@/lib/portalSession";
import { getTeamPortalSession } from "@/lib/teamPortalSession";

// How long a FINISHED early result stays usable. A request still running is always reused, so a slow connection or
// a slow start-up never causes a second call (which would count a second view on some links).
const MAX_AGE_MS = 60 * 1000;
const early = new Map();

const keyOf = (name, payload) => `${name}:${JSON.stringify(payload || {})}`;

function remember(key, start) {
  if (early.has(key)) return;
  let promise;
  try { promise = Promise.resolve(start()); } catch (e) { promise = Promise.reject(e); }
  const entry = { promise, doneAt: 0 };
  promise.then(() => { entry.doneAt = Date.now(); }, () => { entry.doneAt = Date.now(); }); // a failure is reported by the page
  early.set(key, entry);
}

function take(key) {
  const e = early.get(key);
  if (!e) return null;
  early.delete(key);
  return !e.doneAt || Date.now() - e.doneAt < MAX_AGE_MS ? e.promise : null;
}

// Server-function call that reuses the early request when it is the very same call.
export function invokeEarly(name, payload) {
  return take(keyOf(name, payload)) || invokeEdgeFunction(name, payload);
}

// Any other early task (the client / team portals read the database directly).
export function runEarly(key, start) {
  return take(key) || start();
}

// ---- Startup ----
// Only plain opens are started early: never when a link password is involved (the page asks for or recalls it),
// and nothing here reads or changes what the page itself relies on in storage.
function hasLinkPassword(token) {
  try {
    return !!(sessionStorage.getItem(`link_pw_${token}`) || localStorage.getItem(`link_pw_preview_${token}`));
  } catch { return true; }
}

// Keys for the client / team portal tasks (also used by the pages).
export const clientPortalKey = (part, s) => `client-portal:${part}:${s.token}:${s.client_id}`;
export const teamPortalKey = (s) => `team-portal:${s.token}:${s.team_member_id}`;

export function startEarlyData() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const seg = path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  const token = seg[1];
  try {
    if (seg[0] === "q" && token && !hasLinkPassword(token)) {
      // Same shape as ClientQuotationView's load(): portal session fields only when signed in to the portal.
      const payload = { public_token: token };
      if (isPreview) payload.skip_tracking = true;
      const portal = getPortalSession();
      if (portal) return; // the page adds the portal session; leave that case to it
      remember(keyOf("clientViewQuotation", payload), () => invokeEdgeFunction("clientViewQuotation", payload));
    } else if (seg[0] === "portal" && token && !hasLinkPassword(token)) {
      const payload = { public_token: token, skip_tracking: isPreview, password: "" };
      remember(keyOf("getPortalData", payload), () => invokeEdgeFunction("getPortalData", payload));
    } else if (seg[0] === "track" && token) {
      const payload = { token };
      remember(keyOf("getPublicEventData", payload), () => invokeEdgeFunction("getPublicEventData", payload));
    } else if (seg[0] === "review" && token) {
      const payload = { mode: "link", action: "get", token };
      remember(keyOf("submitEventReview", payload), () => invokeEdgeFunction("submitEventReview", payload));
    } else if (seg[0] === "job-sheet" && token) {
      // Same payload as PublicJobSheet (incl. ?for=<team member>, so the early answer is the one the page wants).
      const forMember = new URLSearchParams(window.location.search).get("for");
      const payload = forMember ? { public_token: token, member_id: forMember } : { public_token: token };
      remember(keyOf("getPublicJobSheet", payload), () => invokeEdgeFunction("getPublicJobSheet", payload));
    } else if (seg[0] === "invoice" && token && !hasLinkPassword(token)) {
      if (getPortalSession()) return;
      const payload = { public_token: token };
      remember(keyOf("getPublicInvoice", payload), () => invokeEdgeFunction("getPublicInvoice", payload));
    } else if (seg[0] === "p" && token) {
      const payload = { slug: token };
      remember(keyOf("getPublicProfile", payload), () => invokeEdgeFunction("getPublicProfile", payload));
    } else if (seg[0] === "client-portal") {
      const session = getPortalSession();
      if (!session) return;
      const loaders = import("@/lib/clientPortalAccess"); // loaded once, shared by the three reads
      const access = () => loaders;
      remember(clientPortalKey("data", session), () => access().then((m) => m.loadClientPortalData(session.token, session.client_id)));
      remember(clientPortalKey("tracking", session), () => access().then((m) => m.loadClientPortalTracking(session.token, session.client_id)));
      remember(clientPortalKey("provider", session), () => access().then((m) => m.loadClientPortalProvider(session.token, session.client_id)));
      const review = { mode: "client", action: "get", session_token: session.token, client_id: session.client_id };
      remember(keyOf("submitEventReview", review), () => invokeEdgeFunction("submitEventReview", review));
    } else if (seg[0] === "team-portal") {
      const session = getTeamPortalSession();
      if (!session) return;
      remember(teamPortalKey(session), () => import("@/lib/teamPortalAccess").then((m) => m.loadTeamPortalData(session.token, session.team_member_id)));
    }
  } catch { /* the page loads its data as usual */ }
}
