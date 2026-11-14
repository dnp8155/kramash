// Password gate for public quotation / invoice / project-portal links.
//
// Rule: NOTHING is shown until a password is entered. A link is opened by any one of:
//   * the document's own password (a quotation's client_access_password, an invoice's own, or the quotation
//     behind an invoice) — the "one password per job" the admin shares,
//   * the client's saved portal password (clients.portal_password_hash), which also keeps working for a grace
//     window after the admin regenerates it,
//   * a client already signed in to their client portal (session token).
// If none of those exist the link is treated as NOT secured and is refused (fail closed) — it never opens
// without a password.
import { verifyPassword } from "./portalCrypto.ts";

export type LinkAccess =
  | { ok: true }
  | { ok: false; reason: "requires_auth" | "wrong_password" | "unsecured" };

export const WRONG_PASSWORD_MESSAGE = "Incorrect password. Please try again.";
export const UNSECURED_MESSAGE = "This link isn't available yet. Please ask your service provider to send it to you again.";

async function loadClient(supabase: any, clientId: any) {
  if (!clientId) return null;
  // select("*") so this keeps working before the grace-window columns (migration 0036) exist.
  const { data } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  return data || null;
}

function portalEnabled(client: any): boolean {
  return !!client?.portal_access_enabled && !!client.portal_password_hash;
}

function sessionOk(client: any, body: any): boolean {
  return !!client && !!body.portal_session_token && !!client.portal_access_token
    && body.portal_session_token === client.portal_access_token
    && String(body.portal_client_id || "") === String(client.id);
}

// Current password, or the previous one while its grace window is open.
async function clientPasswordOk(client: any, password: string): Promise<boolean> {
  if (await verifyPassword(password, client.portal_password_hash)) return true;
  const until = client.portal_prev_password_until ? new Date(client.portal_prev_password_until).getTime() : 0;
  return !!client.portal_prev_password_hash && until > Date.now()
    && await verifyPassword(password, client.portal_prev_password_hash);
}

// `ownPasswords` are the document-level passwords (empty strings are ignored).
export async function evaluateLinkAccess(supabase: any, clientId: any, ownPasswords: (string | null | undefined)[], body: any): Promise<LinkAccess> {
  const own = ownPasswords.map((p) => String(p || "")).filter(Boolean);
  const client = await loadClient(supabase, clientId);
  const hasClientPassword = portalEnabled(client);

  if (own.length === 0 && !hasClientPassword) return { ok: false, reason: "unsecured" };
  if (hasClientPassword && sessionOk(client, body)) return { ok: true };

  const pw = String(body.password || "");
  if (!pw) return { ok: false, reason: "requires_auth" };
  if (own.includes(pw)) return { ok: true };
  if (hasClientPassword && await clientPasswordOk(client, pw)) return { ok: true };
  return { ok: false, reason: "wrong_password" };
}

// Standard JSON responses for the quotation / invoice endpoints (the project portal maps these itself).
export function linkAccessResponse(access: LinkAccess): Response | null {
  if (access.ok) return null;
  if (access.reason === "requires_auth") return Response.json({ requires_auth: true, auth_mode: "client_password" });
  if (access.reason === "wrong_password") return Response.json({ error: WRONG_PASSWORD_MESSAGE }, { status: 401 });
  return Response.json({ error: UNSECURED_MESSAGE, unsecured: true }, { status: 403 });
}

// Quotation links: the quotation's own password, or the client's.
export async function checkQuotationLinkAccess(supabase: any, q: any, body: any): Promise<Response | null> {
  return linkAccessResponse(await evaluateLinkAccess(supabase, q?.client_id, [q?.client_access_password], body));
}

// Invoice links: the invoice's own password, the quotation it came from, or the client's.
export async function checkInvoiceLinkAccess(supabase: any, inv: any, body: any): Promise<Response | null> {
  let quotationPassword = "";
  if (inv?.quotation_id) {
    const { data: q } = await supabase.from("quotations").select("client_access_password").eq("id", inv.quotation_id).maybeSingle();
    quotationPassword = q?.client_access_password || "";
  }
  return linkAccessResponse(await evaluateLinkAccess(supabase, inv?.client_id, [inv?.client_access_password, quotationPassword], body));
}
