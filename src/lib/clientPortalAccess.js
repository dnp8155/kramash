import { supabase } from "@/lib/supabaseClient";

// Client-side portal access helpers — replaces the Edge Functions
// (enableClientPortalAccess / updateClientPortalPassword) that are not
// deployed. Uses the browser's Web Crypto API (SHA-256) so password
// hashing happens locally before the hash is stored in Supabase.

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength) {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 48-char hex access token (used in the /client-login/<token> URL).
export function generateAccessToken() {
  return randomHex(24);
}

// Short, human-shareable password (8 chars, no ambiguous characters).
export function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => chars[b % chars.length]).join("");
}

// salt:sha256(salt:password) — same scheme as the backend portalCrypto.
export async function hashPassword(password) {
  const salt = randomHex(16);
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(salt + ":" + password));
  return `${salt}:${bytesToHex(digest)}`;
}

// After a regenerate, the previous password keeps working for this long so a client who hasn't seen the
// new one yet isn't locked out. Mirrors the grace window in verify_client_portal / verify_team_portal.
export const PASSWORD_GRACE_HOURS = 48;

// Column updates for setting `password`: stores the hash (login) and the plain text (so any admin can
// re-copy / re-share it), and parks the old hash for the grace window.
export async function buildPasswordUpdate(currentHash, password) {
  const now = Date.now();
  const update = {
    portal_password_hash: await hashPassword(password),
    portal_password_plain: password,
    portal_password_changed_at: new Date(now).toISOString(),
  };
  if (currentHash) {
    update.portal_prev_password_hash = currentHash;
    update.portal_prev_password_until = new Date(now + PASSWORD_GRACE_HOURS * 3600 * 1000).toISOString();
  }
  return update;
}

// Cleared when portal access is switched off.
export const CLEARED_PORTAL_FIELDS = {
  portal_access_enabled: false,
  portal_password_hash: "",
  portal_password_plain: "",
  portal_password_changed_at: null,
  portal_prev_password_hash: "",
  portal_prev_password_until: null,
  portal_access_token: "",
};

// Enable portal access for a client. Safe to call repeatedly: when access is already on, the existing link and
// password are returned untouched, so sharing again never invalidates what the client already has.
export async function enableClientPortal(clientId, workspaceId) {
  const { data: existing } = await supabase
    .from("clients")
    .select("portal_access_enabled, portal_access_token, portal_password_hash, portal_password_plain, portal_password_changed_at")
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  let accessToken = existing?.portal_access_token || "";
  const alreadyOn = !!existing?.portal_access_enabled && !!accessToken;

  if (alreadyOn && existing.portal_password_plain) {
    return {
      enabled: true, reused: true, password: existing.portal_password_plain,
      login_url: `${window.location.origin}/client-login/${accessToken}`,
      access_token: accessToken, changed_at: existing.portal_password_changed_at || null,
    };
  }

  // Fresh enable, or an older setup that never saved its plain password (keep its link, give it a password
  // we can show from now on; the old password keeps working for the grace window).
  if (!alreadyOn) accessToken = generateAccessToken();
  const password = generatePassword();
  const update = {
    ...(await buildPasswordUpdate(alreadyOn ? existing.portal_password_hash : "", password)),
    portal_access_token: accessToken,
    portal_access_enabled: true,
  };
  const { error } = await supabase.from("clients").update(update).eq("id", clientId).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  return {
    enabled: true, reused: false, password,
    login_url: `${window.location.origin}/client-login/${accessToken}`,
    access_token: accessToken, changed_at: update.portal_password_changed_at,
  };
}

// Disable portal access for a client.
export async function disableClientPortal(clientId, workspaceId) {
  const { error } = await supabase
    .from("clients")
    .update(CLEARED_PORTAL_FIELDS)
    .eq("id", clientId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  return { enabled: false };
}

// Verify a portal password client-side via Supabase RPC (no Edge Function).
// Returns { session_token, client_id, workspace_id, client_name } on success.
export async function verifyClientPortalPassword(token, password) {
  const { data, error } = await supabase.rpc("verify_client_portal", {
    p_token: token,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// Load all portal data client-side via Supabase RPC (no Edge Function).
// Returns the same shape as the old getClientPortalDataByAccess Edge Function.
export async function loadClientPortalData(sessionToken, clientId) {
  const { data, error } = await supabase.rpc("get_client_portal_data", {
    p_session_token: sessionToken,
    p_client_id: clientId,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// Regenerate a client's portal password. The old one keeps working for PASSWORD_GRACE_HOURS.
export async function regenerateClientPortalPassword(clientId, workspaceId) {
  const { data: existing } = await supabase
    .from("clients").select("portal_password_hash").eq("id", clientId).eq("workspace_id", workspaceId).maybeSingle();
  const password = generatePassword();
  const update = await buildPasswordUpdate(existing?.portal_password_hash || "", password);

  const { error } = await supabase.from("clients").update(update).eq("id", clientId).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return { password, changed_at: update.portal_password_changed_at, grace_until: update.portal_prev_password_until || null };
}
