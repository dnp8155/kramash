// Lightweight localStorage helpers for the password-only client portal session.
// The session token is issued by verifyClientPortalAccess and validated by
// getClientPortalDataByAccess on each portal load. It is separate from the
// Base44 auth token used by invited (email) clients.

const TOKEN_KEY = "portal_session_token";
const CLIENT_ID_KEY = "portal_session_client_id";

export function getPortalSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const client_id = localStorage.getItem(CLIENT_ID_KEY);
    if (!token || !client_id) return null;
    return { token, client_id };
  } catch {
    return null;
  }
}

export function setPortalSession(token, client_id) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CLIENT_ID_KEY, client_id);
  } catch { /* ignore */ }
}

export function clearPortalSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CLIENT_ID_KEY);
  } catch { /* ignore */ }
}