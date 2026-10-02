// Lightweight localStorage helpers for the password-only team member portal session.
// The session token is issued by verifyTeamPortalAccess and validated by
// getTeamPortalDataByAccess on each portal load. It is separate from the
// Base44 auth token used by invited (email) team members.

const TOKEN_KEY = "team_portal_session_token";
const MEMBER_ID_KEY = "team_portal_session_member_id";

export function getTeamPortalSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const team_member_id = localStorage.getItem(MEMBER_ID_KEY);
    if (!token || !team_member_id) return null;
    return { token, team_member_id };
  } catch {
    return null;
  }
}

export function setTeamPortalSession(token, team_member_id) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MEMBER_ID_KEY, team_member_id);
  } catch { /* ignore */ }
}

export function clearTeamPortalSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_ID_KEY);
  } catch { /* ignore */ }
}