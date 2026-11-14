// Gmail helpers: encrypting the saved Gmail token, signing OAuth state / tracking links, refreshing an access
// token and sending a message through the Gmail API.
//
// Kramasha asks Google for ONE permission, gmail.send. It can send mail as the studio and nothing else:
// it cannot read, list or delete anything in the mailbox.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, GMAIL_TOKEN_ENCRYPTION_KEY
import { supabaseAdmin } from "./supabaseClient.ts";

export const GMAIL_SCOPES = "openid email https://www.googleapis.com/auth/gmail.send";

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

function secret(): string {
  const s = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY") || "";
  if (s.length < 16) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not set (needs 16+ characters)");
  return s;
}

export function gmailConfigured(): boolean {
  return !!(Deno.env.get("GOOGLE_GMAIL_CLIENT_ID") && Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET") && (Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY") || "").length >= 16);
}

async function aesKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode("kramasha-gmail-token:" + secret()));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(plain)));
  return b64(iv) + "." + b64(ct);
}

export async function decryptToken(stored: string): Promise<string> {
  const [iv, ct] = stored.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(), unb64(ct));
  return dec.decode(pt);
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode("kramasha-gmail-sign:" + secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message))));
}

// Signed, expiring value for the OAuth "state" so the callback knows which workspace/user started the flow.
export async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, iat: Date.now() })));
  return body + "." + await hmac(body);
}

export async function verifyState(state: string, maxAgeMs = 15 * 60 * 1000): Promise<Record<string, any> | null> {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  try {
    const payload = JSON.parse(dec.decode(unb64url(body)));
    return Date.now() - Number(payload.iat) <= maxAgeMs ? payload : null;
  } catch {
    return null;
  }
}

// Link in an email → our redirect, signed so it cannot be pointed at any other address.
export async function signLink(token: string, url: string): Promise<string> {
  return (await hmac(`link:${token}:${url}`)).slice(0, 24);
}

export function functionsBase(): string {
  const base = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
  return `${base}/functions/v1`;
}

export function appUrl(): string {
  return (Deno.env.get("APP_URL") || "https://www.kramasha.com").replace(/\/+$/, "");
}

export function redirectUri(): string {
  return `${functionsBase()}/gmailOAuthCallback`;
}

export async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_GMAIL_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET") || "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || json?.error || "Google rejected the sign-in");
  return json as { access_token: string; refresh_token?: string; id_token?: string; scope?: string };
}

export function emailFromIdToken(idToken?: string): string {
  try {
    const payload = JSON.parse(dec.decode(unb64url(String(idToken).split(".")[1])));
    return String(payload.email || "");
  } catch {
    return "";
  }
}

export class GmailAuthError extends Error {}

async function accessTokenFor(account: { id: string; refresh_token_enc: string }): Promise<string> {
  const refresh = await decryptToken(account.refresh_token_enc);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: Deno.env.get("GOOGLE_GMAIL_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_GMAIL_CLIENT_SECRET") || "",
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json?.error === "invalid_grant") {
      await supabaseAdmin.from("messaging_accounts").update({ status: "needs_reconnect", last_error: "Google access was removed or expired" }).eq("id", account.id);
      throw new GmailAuthError("Your Gmail connection expired. Reconnect Gmail in Preferences.");
    }
    throw new Error(json?.error_description || json?.error || "Could not reach Gmail");
  }
  return json.access_token as string;
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Plain message text → simple HTML. Web links are routed through the click tracker and an invisible pixel is
// added at the end, so the studio can see "Link clicked" / "Likely opened".
export async function buildHtml(text: string, trackingToken: string): Promise<string> {
  const base = functionsBase();
  const parts: string[] = [];
  let last = 0;
  const re = /https?:\/\/[^\s<>"']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let url = m[0];
    const trail = url.match(/[.,;:!?)]+$/)?.[0] || "";
    if (trail) url = url.slice(0, -trail.length);
    parts.push(escHtml(text.slice(last, m.index)));
    const sig = await signLink(trackingToken, url);
    const href = `${base}/trackEmail?t=${trackingToken}&u=${encodeURIComponent(url)}&s=${sig}`;
    parts.push(`<a href="${escHtml(href)}">${escHtml(url)}</a>${escHtml(trail)}`);
    last = m.index + m[0].length;
  }
  parts.push(escHtml(text.slice(last)));
  const body = parts.join("").replace(/\r?\n/g, "<br>");
  const pixel = `<img src="${base}/trackEmail?t=${trackingToken}&p=1" width="1" height="1" alt="" style="display:none">`;
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1d21">${body}</div>${pixel}`;
}

const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(enc.encode(s))}?=`);

function buildMime(opts: { from: string; fromName?: string; to: string; subject: string; text: string; html: string }): string {
  const boundary = "kramasha_" + crypto.randomUUID().replace(/-/g, "");
  const from = opts.fromName ? `${encodeHeader(opts.fromName.replace(/["\r\n]/g, ""))} <${opts.from}>` : opts.from;
  const chunk = (s: string) => b64(enc.encode(s)).replace(/(.{76})/g, "$1\r\n");
  return [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject.replace(/[\r\n]+/g, " "))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    chunk(opts.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    chunk(opts.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

// Sends one email from the workspace's connected Gmail. Returns Gmail's message id.
export async function sendViaGmail(account: { id: string; email: string; refresh_token_enc: string }, msg: { to: string; subject: string; text: string; html: string; fromName?: string }): Promise<string> {
  const token = await accessTokenFor(account);
  const raw = b64url(enc.encode(buildMime({ from: account.email, fromName: msg.fromName, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html })));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      await supabaseAdmin.from("messaging_accounts").update({ status: "needs_reconnect", last_error: json?.error?.message || "Gmail refused the request" }).eq("id", account.id);
      throw new GmailAuthError("Gmail refused the request. Reconnect Gmail in Preferences.");
    }
    throw new Error(json?.error?.message || "Gmail could not send the message");
  }
  return String(json.id || "");
}

export async function revokeToken(account: { refresh_token_enc: string }) {
  try {
    const refresh = await decryptToken(account.refresh_token_enc);
    await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refresh }) });
  } catch { /* best effort: the row is removed either way */ }
}
