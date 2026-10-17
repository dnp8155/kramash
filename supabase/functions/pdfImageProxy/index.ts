import { withCors } from "../_shared/cors.ts";
// pdfImageProxy — fetches a picture from a web link (Google Drive, Dropbox, any site) and hands it straight
// back so the browser can draw it into a quotation PDF. Browsers refuse to put pictures from sites that don't
// send CORS headers into a PDF; this gets around that. NOTHING is stored.
//
// Who may call it:
//   * a signed-in user (the quotation editor / preview), or
//   * a client's browser downloading a shared quotation: then `public_token` must belong to a quotation whose
//     saved template images include this exact link — so it can't be used as an open proxy.
// Safety: https only, no private / internal addresses (checked on every redirect), images only, size + time capped.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 12000;

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")
    || v.startsWith("::ffff:") || v.startsWith("ff");
}

// Throws if the address is not a public https host.
async function assertPublicHttps(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("That isn't a valid link."); }
  if (u.protocol !== "https:") throw new Error("Only https links can be used.");
  if (u.username || u.password) throw new Error("Links with a login in them can't be used.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")
    || host === "metadata.google.internal") throw new Error("That address can't be used.");
  if (/^[0-9.]+$/.test(host) && isPrivateIPv4(host)) throw new Error("That address can't be used.");
  if (host.includes(":") && isPrivateIPv6(host)) throw new Error("That address can't be used.");
  // Best effort: make sure the name doesn't point at an internal address.
  try {
    // deno-lint-ignore no-explicit-any
    const resolve = (Deno as any).resolveDns;
    if (typeof resolve === "function" && !/^[0-9.]+$/.test(host) && !host.includes(":")) {
      const v4: string[] = await resolve(host, "A").catch(() => []);
      const v6: string[] = await resolve(host, "AAAA").catch(() => []);
      if (v4.some(isPrivateIPv4) || v6.some(isPrivateIPv6)) throw new Error("That address can't be used.");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "That address can't be used.") throw e;
  }
  return u;
}

// Turns "share" links into links that point at the picture itself. Keep in sync with src/lib/templateImages.js.
function normalizeImageUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { return raw; }
  const host = u.hostname.toLowerCase();
  if (host === "drive.google.com" || host === "docs.google.com") {
    const m = u.pathname.match(/\/(?:file\/d|d)\/([\w-]+)/);
    const id = (m && m[1]) || u.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
    u.searchParams.delete("dl");
    u.searchParams.set("raw", "1");
    return u.toString();
  }
  return raw;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || "").trim();
    if (!url) return Response.json({ error: "A picture link is required." }, { status: 400 });

    const user = await getUserFromRequest(req);
    if (!user) {
      // A client downloading a shared quotation: the link must be one saved on that quotation.
      const token = String(body.public_token || "");
      if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const { data: list } = await supabaseAdmin.from("quotations").select("template_config").eq("public_token", token).limit(5);
      const allowed = (list || []).some((q: any) => {
        try {
          const cfg = typeof q.template_config === "string" ? JSON.parse(q.template_config || "{}") : (q.template_config || {});
          return Array.isArray(cfg.images) && cfg.images.some((im: any) => String(im?.url || "").trim() === url);
        } catch { return false; }
      });
      if (!allowed) return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Follow redirects by hand so every hop is checked.
    // The allowlist above used the link exactly as saved; the fetch uses the direct-picture form of it.
    let current = (await assertPublicHttps(normalizeImageUrl(url))).toString();
    let resp: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      resp = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KramashaPdfImage/1.0)", Accept: "image/*,*/*;q=0.5" },
      });
      if (resp.status >= 300 && resp.status < 400 && resp.headers.get("location")) {
        if (hop === MAX_REDIRECTS) return Response.json({ error: "That link redirects too many times." }, { status: 422 });
        current = (await assertPublicHttps(new URL(resp.headers.get("location")!, current).toString())).toString();
        continue;
      }
      break;
    }
    if (!resp || !resp.ok) return Response.json({ error: `The picture couldn't be opened (${resp?.status || "no response"}). Check the link is shared as "anyone with the link".` }, { status: 422 });

    const type = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!type.startsWith("image/") || type.includes("svg")) {
      return Response.json({ error: "That link isn't a picture. Open the image itself and copy its link (for Drive / Dropbox: share it as \"anyone with the link\")." }, { status: 422 });
    }
    const declared = Number(resp.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return Response.json({ error: "That picture is too large (max 8 MB)." }, { status: 422 });

    // Read with a hard cap, whatever the headers claimed.
    const reader = resp.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { await reader.cancel(); return Response.json({ error: "That picture is too large (max 8 MB)." }, { status: 422 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }

    return Response.json({ data_url: `data:${type};base64,${toBase64(bytes)}`, content_type: type, bytes: total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the picture.";
    return Response.json({ error: message }, { status: 422 });
  }
}));
