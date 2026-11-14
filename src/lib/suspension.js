// Read-only mode for a suspended workspace: the owner can open and view everything and export their data, but cannot
// add, edit or delete. The flag is set from the workspace being shown (WorkspaceContext). Saves go through the data
// layer (supabaseClient) and the server-function caller (edgeFunction), and both ask here before writing.
// The database has its own rule too (migration 0072), so this is the friendly front door, not the only lock.

let suspended = false;

export const SUSPENDED_MESSAGE = "This workspace is suspended. You can view and export your data, but not make changes. Please contact support.";

export function setWorkspaceSuspended(value) { suspended = !!value; }
export function isWorkspaceSuspended() { return suspended; }

export function suspendedError() {
  const err = new Error(SUSPENDED_MESSAGE);
  err.data = { error: SUSPENDED_MESSAGE };
  err.status = 403;
  return err;
}

// Tables a suspended workspace can still write to: asking support for help, upgrade requests, notifications (read marks),
// push and passkey registration, the person's own profile, and the system's own logs.
const WRITE_EXEMPT_TABLES = new Set([
  "support_tickets", "upgrade_requests", "notifications", "push_subscriptions",
  "user_auth_credentials", "profiles", "audit_logs", "storage_usage",
]);

// Throws when this table must not be written right now.
export function assertTableWritable(table) {
  if (suspended && !WRITE_EXEMPT_TABLES.has(table)) throw suspendedError();
}

// Server functions that still work while suspended: reading, the assistant, signing in, asking for an upgrade, and
// the background notification jobs. Everything else (creating, recording payments, sending messages, sharing links…) is held.
const ALLOWED_FUNCTIONS = new Set([
  "agentChat", "clientViewQuotation", "submitUpgradeRequest", "generateNotifications", "dispatchPushNotification",
  "registerPushSubscription", "trackStorageUsage", "trackEmail", "getPushConfig",
  "sendOtp", "verifyOtp", "sendRegistrationOtp", "verifyRegistrationOtp", "verifyFirebaseToken",
  "generateWebAuthnAssertionChallenge", "generateWebAuthnRegistrationChallenge", "verifyWebAuthnAssertion", "verifyWebAuthnRegistration",
  "initWorkspaceSubscription",
]);
export function functionAllowedWhenSuspended(name) {
  return ALLOWED_FUNCTIONS.has(name) || /^(get[A-Z]|verify[A-Z]|admin[A-Z])/.test(name);
}
export function assertFunctionAllowed(name) {
  if (suspended && !functionAllowedWhenSuspended(name)) throw suspendedError();
}
