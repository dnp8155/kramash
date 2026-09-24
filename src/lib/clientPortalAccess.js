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

// Enable portal access for a client — generates token + password, stores
// the hash, and returns the plaintext password ONCE for the admin to share.
export async function enableClientPortal(clientId, workspaceId) {
  const accessToken = generateAccessToken();
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const { error } = await supabase
    .from("clients")
    .update({
      portal_access_token: accessToken,
      portal_password_hash: passwordHash,
      portal_access_enabled: true,
    })
    .eq("id", clientId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  const loginUrl = `${window.location.origin}/client-login/${accessToken}`;
  return { enabled: true, password, login_url: loginUrl, access_token: accessToken };
}

// Disable portal access for a client.
export async function disableClientPortal(clientId, workspaceId) {
  const { error } = await supabase
    .from("clients")
    .update({
      portal_access_enabled: false,
      portal_password_hash: "",
      portal_access_token: "",
    })
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

// Regenerate a client's portal password. Returns the new plaintext password ONCE.
export async function regenerateClientPortalPassword(clientId, workspaceId) {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const { error } = await supabase
    .from("clients")
    .update({ portal_password_hash: passwordHash })
    .eq("id", clientId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  return { password };
}