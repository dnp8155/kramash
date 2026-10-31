// Pictures for quotation PDFs, taken from web links or picked from the person's own device (nothing is uploaded or
// stored by us — see localImages.js for the on-device ones).
//
// A browser will only draw a picture into a PDF if the site hosting it allows that (CORS). Sites that do
// (Unsplash, Cloudinary, …) are fetched directly. Sites that don't (Google Drive, Dropbox, most others) go
// through the pdfImageProxy edge function, which fetches the picture and hands it back without storing it.
// If a picture still can't be loaded the PDF is made without it and the caller is told which ones failed.
import { invokeEdgeFunction } from "@/lib/edgeFunction";
import { getLocalImageDataUrl } from "@/lib/localImages";
import { blobToDataUrl, downscale } from "@/lib/imageShrink";

export const MAX_TEMPLATE_IMAGES = 3;
const DIRECT_TIMEOUT_MS = 8000;

// Turns "share" links into links that point at the picture itself. Keep in sync with the edge function.
export function normalizeImageUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  let u;
  try { u = new URL(s); } catch { return s; }
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
  return s;
}

async function fetchDirect(url) {
  const res = await fetch(url, { mode: "cors", signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/") || blob.type.includes("svg")) throw new Error("Not a picture");
  return blobToDataUrl(blob);
}

const cache = new Map(); // link -> data URL, for this page session

// Resolves to { dataUrl, via: "direct" | "proxy" }; throws an Error with a readable message on failure.
export async function loadTemplateImage(rawUrl, { publicToken = "" } = {}) {
  const url = String(rawUrl || "").trim();
  if (!url) throw new Error("No link.");
  if (cache.has(url)) return cache.get(url);

  const normalized = normalizeImageUrl(url);
  let dataUrl = "";
  let via = "direct";
  try {
    dataUrl = await fetchDirect(normalized);
  } catch {
    via = "proxy";
    const res = await invokeEdgeFunction("pdfImageProxy", { url, public_token: publicToken || undefined });
    dataUrl = res?.data_url || "";
    if (!dataUrl) throw new Error("The picture couldn't be loaded.");
  }
  const out = { dataUrl: await downscale(dataUrl), via };
  cache.set(url, out);
  return out;
}

// For the "Test" button next to each link. Never throws.
export async function checkTemplateImage(rawUrl) {
  try {
    const { via } = await loadTemplateImage(rawUrl);
    return { ok: true, via };
  } catch (e) {
    return { ok: false, error: e?.data?.error || e?.message || "The picture couldn't be loaded." };
  }
}

// Loads one list of { url, caption } (web link) or { local, localName, caption } (kept on this device) pictures; returns the ones that loaded and the links that failed.
async function prepareList(list, publicToken) {
  const wanted = (Array.isArray(list) ? list : [])
    .filter((im) => im && (im.local || String(im.url || "").trim()))
    .slice(0, MAX_TEMPLATE_IMAGES);
  const results = await Promise.all(wanted.map(async (im) => {
    try {
      if (im.local) {
        const dataUrl = await getLocalImageDataUrl(im.local);
        if (!dataUrl) throw new Error("not on this device");
        return { ok: true, image: { url: dataUrl, caption: im.caption || "" } };
      }
      const { dataUrl } = await loadTemplateImage(im.url, { publicToken });
      return { ok: true, image: { url: dataUrl, caption: im.caption || "" } };
    } catch {
      return { ok: false, url: im.local ? `device:${im.localName || "picture"}` : im.url };
    }
  }));
  return { images: results.filter((r) => r.ok).map((r) => r.image), failed: results.filter((r) => !r.ok).map((r) => r.url) };
}

// Replaces each saved link — in templateConfig.images (Modern Style) and in the Custom template's "Pictures"
// blocks — with a ready-to-draw picture. Links that can't be loaded are dropped from the PDF and returned in
// `failed`. The templates only ever see pictures that already loaded.
export async function prepareTemplateImages(templateConfig, { publicToken = "" } = {}) {
  const cfg = templateConfig || {};
  const failed = [];
  let out = cfg;

  if (Array.isArray(cfg.images) && cfg.images.length) {
    const r = await prepareList(cfg.images, publicToken);
    failed.push(...r.failed);
    out = { ...out, images: r.images };
  }
  const blocks = cfg.custom?.blocks;
  if (Array.isArray(blocks) && blocks.some((b) => b?.type === "images" && b.images?.length)) {
    const prepared = await Promise.all(blocks.map(async (b) => {
      if (b?.type !== "images" || !b.images?.length) return b;
      const r = await prepareList(b.images, publicToken);
      failed.push(...r.failed);
      return { ...b, images: r.images };
    }));
    out = { ...out, custom: { ...cfg.custom, blocks: prepared } };
  }
  return { templateConfig: out, failed };
}
