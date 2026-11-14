// Pictures picked from a phone / computer for quotation PDFs. They are shrunk and kept in THIS browser only
// (IndexedDB) — nothing is uploaded and nothing goes to the database. A quotation saves just a short reference
// (`local` id + file name) next to the picture slot; on another device the slot shows "not on this device".
import { fileToDownscaledBlob, blobToDataUrl } from "@/lib/imageShrink";

const DB_NAME = "kramasha-local-images";
const STORE = "images";
const MAX_ITEMS = 40;           // oldest-used pictures are dropped beyond this, so storage stays small
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("unsupported"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("blocked"));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function tx(mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(run(store)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}
const wrap = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

// Same picture picked twice gets the same id, so duplicated quotations keep working and nothing is stored twice.
async function idFor(file) {
  try {
    const hash = await crypto.subtle.digest("SHA-1", await file.arrayBuffer());
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
  } catch {
    return `${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Shrinks the file and keeps it on this device. Resolves { id, name }; throws an Error with a readable message.
export async function saveLocalImage(file) {
  if (!file || !String(file.type || "").startsWith("image/") || /svg/.test(file.type)) throw new Error("Please choose a photo (JPG, PNG, WebP…).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That picture is too large (max 25 MB).");
  const [id, blob] = await Promise.all([idFor(file), fileToDownscaledBlob(file)]);
  const now = Date.now();
  try {
    await tx("readwrite", async (store) => {
      store.put({ id, blob, name: file.name || "picture", createdAt: now, usedAt: now });
      const all = await wrap(store.getAll());
      if (all.length > MAX_ITEMS) {
        all.sort((a, b) => (a.usedAt || 0) - (b.usedAt || 0)).slice(0, all.length - MAX_ITEMS).forEach((r) => store.delete(r.id));
      }
    });
  } catch {
    throw new Error("This browser can't keep pictures on the device (private mode?). Use a web link instead.");
  }
  return { id, name: file.name || "picture" };
}

// The shrunk picture, or null when it isn't on this device.
export async function getLocalImageBlob(id) {
  if (!id) return null;
  try {
    const rec = await tx("readonly", (store) => wrap(store.get(id)));
    return rec?.blob || null;
  } catch {
    return null;
  }
}

// For the PDF: the picture as a data URL ("" when missing). Marks it as recently used so it isn't cleaned up.
export async function getLocalImageDataUrl(id) {
  const blob = await getLocalImageBlob(id);
  if (!blob) return "";
  tx("readwrite", async (store) => {
    const rec = await wrap(store.get(id));
    if (rec) store.put({ ...rec, usedAt: Date.now() });
  }).catch(() => {});
  return blobToDataUrl(blob);
}
