// Pictures for quotation PDFs, taken from web links (nothing is uploaded or stored by us).
//
// A browser will only draw a picture into a PDF if the site hosting it allows that (CORS). Sites that do
// (Unsplash, Cloudinary, …) are fetched directly. Sites that don't (Google Drive, Dropbox, most others) go
// through the pdfImageProxy edge function, which fetches the picture and hands it back without storing it.
// If a picture still can't be loaded the PDF is made without it and the caller is told which ones failed.
import { invokeEdgeFunction } from "@/lib/edgeFunction";

export const MAX_TEMPLATE_IMAGES = 3;
const MAX_SIDE = 1600; // pictures are shrunk to this before going into the PDF, to keep it light
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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Shrinks to MAX_SIDE and re-encodes as JPEG (white background, so transparent PNGs don't turn black).
function downscale(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("That file couldn't be read as a picture."));
    img.src = dataUrl;
  });
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

// Loads one list of { url, caption } pictures; returns the ones that loaded and the links that failed.
async function prepareList(list, publicToken) {
  const wanted = (Array.isArray(list) ? list : [])
    .filter((im) => im && String(im.url || "").trim())
    .slice(0, MAX_TEMPLATE_IMAGES);
  const results = await Promise.all(wanted.map(async (im) => {
    try {
      const { dataUrl } = await loadTemplateImage(im.url, { publicToken });
      return { ok: true, image: { url: dataUrl, caption: im.caption || "" } };
    } catch {
      return { ok: false, url: im.url };
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
