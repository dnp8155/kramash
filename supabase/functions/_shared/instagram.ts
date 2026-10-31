// Instagram helpers (official Instagram Graph API, through Facebook Login): the connected account and the latest
// photos for the public profile.
//
// The person signs in with Facebook and allows Kramasha to READ their Instagram photos: instagram_basic plus
// pages_show_list / pages_read_engagement (to find the Facebook Page their Instagram Business or Creator account is
// linked to). It cannot post, message or change anything. The Page access token we get from a long-lived login does
// not expire, so there is nothing to renew. It is kept encrypted in messaging_accounts (provider "instagram"; the
// @username is saved in the email column, the token and the Instagram account id together in the encrypted value)
// and never leaves the server.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET   the Meta app's App ID and App secret (App settings → Basic)
//   INSTAGRAM_CONFIG_ID                      optional: the Facebook Login for Business configuration id, if the app requires one
//   (+ GMAIL_TOKEN_ENCRYPTION_KEY, already set, which also protects this token)
import { supabaseAdmin } from "./supabaseClient.ts";
import { decryptToken, encryptToken, functionsBase } from "./gmail.ts";

export const INSTAGRAM_SCOPES = "instagram_basic,pages_show_list,pages_read_engagement";
const GRAPH = "https://graph.facebook.com/v21.0";
const CACHE_MS = 20 * 60 * 1000;
export const MAX_PHOTOS = 12;

export function instagramConfigured(): boolean {
  return !!(Deno.env.get("INSTAGRAM_APP_ID") && Deno.env.get("INSTAGRAM_APP_SECRET") && (Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY") || "").length >= 16);
}

export const instagramRedirectUri = () => `${functionsBase()}/instagramOAuthCallback`;

// The Facebook sign-in page address for this person (state says which workspace is connecting).
export function instagramLoginUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: Deno.env.get("INSTAGRAM_APP_ID") || "",
    redirect_uri: instagramRedirectUri(),
    response_type: "code",
    state,
  });
  const configId = Deno.env.get("INSTAGRAM_CONFIG_ID");
  if (configId) {
    // Facebook Login for Business (Unified Login): the configuration decides the permissions, so no scope is sent. Without
    // override_default_response_type Meta answers with a token on the address instead of the "code" this server needs.
    params.set("config_id", configId);
    params.set("override_default_response_type", "true");
  } else params.set("scope", INSTAGRAM_SCOPES);
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function getInstagramAccount(workspaceId: string) {
  const { data } = await supabaseAdmin.from("messaging_accounts").select("*").eq("workspace_id", workspaceId).eq("provider", "instagram").maybeSingle();
  return data || null;
}

async function graphJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// The one-time code from Facebook's sign-in page → the Instagram account to read (its id, @username and the Page token).
export async function connectWithCode(code: string) {
  const appId = Deno.env.get("INSTAGRAM_APP_ID") || "";
  const secret = Deno.env.get("INSTAGRAM_APP_SECRET") || "";
  const short = await graphJson(`${GRAPH}/oauth/access_token?${new URLSearchParams({ client_id: appId, client_secret: secret, redirect_uri: instagramRedirectUri(), code })}`);
  if (!short.ok || !short.json?.access_token) throw new Error(short.json?.error?.message || "Facebook rejected the sign-in");

  // A long-lived login (about 60 days) makes the Page tokens below non-expiring.
  const long = await graphJson(`${GRAPH}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: secret, fb_exchange_token: short.json.access_token })}`);
  const userToken = long.json?.access_token || short.json.access_token;

  const pages = await graphJson(`${GRAPH}/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50", access_token: userToken })}`);
  if (!pages.ok) throw new Error(pages.json?.error?.message || "Could not read your Facebook Pages");
  const page = (Array.isArray(pages.json?.data) ? pages.json.data : []).find((p: any) => p?.instagram_business_account?.id && p?.access_token);
  if (!page) throw new Error("no_page");
  return { token: String(page.access_token), igId: String(page.instagram_business_account.id), username: String(page.instagram_business_account.username || "") };
}

export async function saveInstagramAccount(workspaceId: string, userId: string, c: { token: string; igId: string; username: string }) {
  const { error } = await supabaseAdmin.from("messaging_accounts").upsert({
    workspace_id: workspaceId, user_id: userId, provider: "instagram", email: c.username || c.igId,
    refresh_token_enc: await encryptToken(JSON.stringify({ t: c.token, i: c.igId })), status: "active", last_error: null,
  }, { onConflict: "workspace_id,provider" });
  if (error) throw error;
}

const photoCache = new Map<string, { at: number; username: string; photos: any[] }>();
export const forgetInstagramPhotos = (workspaceId: string) => photoCache.delete(workspaceId);

async function markReconnect(account: any, why: string) {
  await supabaseAdmin.from("messaging_accounts").update({ status: "needs_reconnect", last_error: why }).eq("id", account.id);
}

// The latest photos of the connected account: { username, photos: [{ id, url, link, alt }] }, newest first. Never
// throws; empty when anything is off (not connected, access removed, Instagram unreachable) so the public page just
// leaves the section out.
export async function getInstagramPhotos(workspaceId: string): Promise<{ username: string; photos: any[] }> {
  const cached = photoCache.get(workspaceId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached;
  try {
    const account = await getInstagramAccount(workspaceId);
    if (!account || account.status !== "active") return { username: "", photos: [] };
    const { t: token, i: igId } = JSON.parse(await decryptToken(account.refresh_token_enc));
    const r = await graphJson(`${GRAPH}/${igId}/media?${new URLSearchParams({ fields: "id,media_type,media_url,thumbnail_url,permalink,caption", limit: String(MAX_PHOTOS * 2), access_token: token })}`);
    if (!r.ok) {
      if (r.status === 400 || r.status === 401 || r.status === 403) await markReconnect(account, r.json?.error?.message || "Instagram refused the request");
      return cached || { username: "", photos: [] };
    }
    const photos = (Array.isArray(r.json?.data) ? r.json.data : [])
      .map((m: any) => ({
        id: String(m.id),
        url: String((m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) || ""),
        link: String(m.permalink || ""),
        alt: String(m.caption || "").replace(/\s+/g, " ").slice(0, 100),
      }))
      .filter((p: any) => p.url.startsWith("https://") && p.link.startsWith("https://"))
      .slice(0, MAX_PHOTOS);
    const value = { at: Date.now(), username: String(account.email || ""), photos };
    photoCache.set(workspaceId, value);
    return value;
  } catch {
    return cached || { username: "", photos: [] };
  }
}
