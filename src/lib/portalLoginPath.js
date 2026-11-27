// Where a portal visitor signs in again. A client / team portal sign-in link carries a token
// (/client-login/<token>, /team-login/<token>), so the page you last signed in from is remembered here;
// when the portal session ends we send people back to it instead of the marketing home page.
const KEYS = { client: "kramasha_portal_login_client", team: "kramasha_portal_login_team" };
const BASES = { client: "/client-login/", team: "/team-login/" };

export function rememberPortalLogin(kind, token) {
  if (!token) return;
  try { localStorage.setItem(KEYS[kind], BASES[kind] + encodeURIComponent(token)); } catch { /* ignore */ }
}

// The remembered sign-in page, or "/" when there is none (a link opened on a fresh device).
export function portalLoginPath(kind) {
  try {
    const p = localStorage.getItem(KEYS[kind]);
    return p && p.startsWith(BASES[kind]) ? p : "/";
  } catch { return "/"; }
}
