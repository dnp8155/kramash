// Public page sections: owner-chosen blocks (videos, services, testimonials, links, text, FAQ)
// stored as JSON in workspace.display_preferences.public_sections — no storage, no extra tables.

export const MAX_SECTIONS = 8;
export const MAX_ITEMS = 12;
// Section kinds that can appear only once on a profile.
export const SINGLE_SECTION_TYPES = new Set(["map"]);
// Some sections hold fewer items than the default.
const MAX_ITEMS_BY_TYPE = { videos: 4, testimonials: 6, faq: 8, map: 1 };
export const maxItemsFor = (type) => MAX_ITEMS_BY_TYPE[type] ?? MAX_ITEMS;

export const SECTION_TYPES = {
  videos: { label: "Videos", hint: "YouTube or Vimeo links", defaultTitle: "Our Films", blank: () => ({ url: "", title: "" }) },
  services: { label: "Services", hint: "What you offer, with optional price", defaultTitle: "Services", blank: () => ({ title: "", description: "", price: "" }) },
  testimonials: { label: "Testimonials", hint: "Kind words from clients", defaultTitle: "What Clients Say", blank: () => ({ name: "", quote: "" }) },
  links: { label: "Links & downloads", hint: "Projects, brochures, price lists", defaultTitle: "Projects & Downloads", blank: () => ({ title: "", url: "", note: "" }) },
  text: { label: "Text", hint: "A free paragraph", defaultTitle: "More About Us", blank: () => ({ body: "" }) },
  map: { label: "Map", hint: "Google Maps location", defaultTitle: "Find Us", blank: () => ({ url: "", title: "", size: "big" }) },
  faq: { label: "FAQ", hint: "Questions and answers", defaultTitle: "FAQ", blank: () => ({ q: "", a: "" }) },
};

export const newSectionId = () => `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newSection(type) {
  const def = SECTION_TYPES[type];
  return { id: newSectionId(), type, title: def.defaultTitle, visible: true, items: [def.blank()] };
}

// Only http(s) links are ever rendered as hrefs — blocks javascript:/data: URLs.
export function safeUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : /^[a-z][a-z0-9+.-]*:/i.test(s) ? "" : `https://${s}`;
  if (!withScheme) return "";
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch { return ""; }
}

// Returns { provider, id } for YouTube / Vimeo links, else null.
export function parseVideoUrl(raw) {
  const url = safeUrl(raw);
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const ytId = /^[\w-]{11}$/;
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return ytId.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v") || "";
      return ytId.test(id) ? { provider: "youtube", id } : null;
    }
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    return m ? { provider: "youtube", id: m[1] } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/\/(\d{6,12})(?:\/|$)/);
    return m ? { provider: "vimeo", id: m[1] } : null;
  }
  return null;
}

// Google Maps links -> { embed, open }. `embed` is an iframe-able URL (null for short links, which can only be opened);
// `open` is the link to visit. Also accepts a pasted <iframe> embed snippet.
// Only Google's own domains (google.com, google.co.in, google.com.au, google.de …) can be embedded.
const GMAPS_HOST = /^(?:www\.|maps\.)?google\.(?:com?(?:\.[a-z]{2})?|[a-z]{2})$/i;
// The address Google itself redirects its old `maps?q=…&output=embed` links to. Using it directly avoids that
// redirect (its response carries X-Frame-Options, which some browsers enforce, leaving a blank box).
const encQ = (s) => encodeURIComponent(String(s).replace(/!/g, " ")).replace(/%20/g, "+").replace(/%2C/gi, ",");
function mapEmbedUrl(q, coords) {
  const [lat, lng] = String(coords || "").split(",");
  if (lat && lng) return `https://www.google.com/maps/embed?origin=mfe&pb=!1m12!1m8!1m3!1d15096.85!2d${lng}!3d${lat}!3m2!1i1024!2i768!4f13.1!2m1!1s${encQ(q)}!6i15`;
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${encQ(q)}!6i15`;
}

export function parseMapUrl(raw) {
  let s = String(raw || "").trim();
  const iframeSrc = s.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) s = iframeSrc[1].replace(/&amp;/g, "&");
  const url = safeUrl(s);
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || (host === "goo.gl" && u.pathname.startsWith("/maps"))) return { embed: null, open: url };
  if (!GMAPS_HOST.test(host)) return null;
  const path = decodeURIComponent(u.pathname.replace(/\+/g, " "));
  if (!(path.startsWith("/maps") || host.startsWith("maps."))) return null;
  if (path.startsWith("/maps/embed")) return { embed: url, open: url };
  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const at = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coords = pin ? `${pin[1]},${pin[2]}` : at ? `${at[1]},${at[2]}` : "";
  const named = (path.match(/\/maps\/(?:place|search)\/([^/@]+)/) || [])[1];
  const query = (named || "").trim() || u.searchParams.get("q") || u.searchParams.get("query") || u.searchParams.get("destination") || "";
  const q = query || coords;
  if (!q) return { embed: null, open: url };
  return { embed: mapEmbedUrl(q, query ? coords : ""), open: url };
}

export const videoThumb = (v) => (v?.provider === "youtube" ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : "");
export const videoEmbed = (v) =>
  v?.provider === "youtube" ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`
    : v?.provider === "vimeo" ? `https://player.vimeo.com/video/${v.id}?autoplay=1` : "";

const str = (v, max) => String(v ?? "").slice(0, max);

// Cleans whatever is stored/typed into a safe, bounded shape. Used on load, save and render.
export function normalizeSections(raw) {
  if (!Array.isArray(raw)) return [];
  const seenSingle = new Set();
  return raw.slice(0, MAX_SECTIONS).filter((s) => {
    if (!s || !SECTION_TYPES[s.type]) return false;
    if (SINGLE_SECTION_TYPES.has(s.type)) { if (seenSingle.has(s.type)) return false; seenSingle.add(s.type); }
    return true;
  }).map((s) => ({
    id: str(s.id, 40) || newSectionId(),
    type: s.type,
    title: str(s.title, 60),
    visible: s.visible !== false,
    items: (Array.isArray(s.items) ? s.items : []).slice(0, maxItemsFor(s.type)).map((it) => {
      it = it || {};
      switch (s.type) {
        case "videos": return { url: str(it.url, 300), title: str(it.title, 80) };
        case "map": return { url: str(it.url, 600), title: str(it.title, 80), size: it.size === "small" ? "small" : "big" };
        case "services": return { title: str(it.title, 80), description: str(it.description, 300), price: str(it.price, 40) };
        case "testimonials": return { name: str(it.name, 60), quote: str(it.quote, 400) };
        case "links": return { title: str(it.title, 80), url: str(it.url, 300), note: str(it.note, 120) };
        case "text": return { body: str(it.body, 1500) };
        default: return { q: str(it.q, 140), a: str(it.a, 500) };
      }
    }),
  }));
}

// An item counts only if it has its key content — empty rows never reach the public page.
export function itemIsFilled(type, it) {
  switch (type) {
    case "videos": return !!parseVideoUrl(it.url);
    case "map": return !!parseMapUrl(it.url);
    case "services": return !!it.title.trim();
    case "testimonials": return !!it.quote.trim();
    case "links": return !!it.title.trim() && !!safeUrl(it.url);
    case "text": return !!it.body.trim();
    default: return !!it.q.trim() && !!it.a.trim();
  }
}

// Sections ready to show visitors: visible and holding at least one filled item.
export function publicSections(raw) {
  return normalizeSections(raw)
    .filter((s) => s.visible)
    .map((s) => ({ ...s, items: s.items.filter((it) => itemIsFilled(s.type, it)) }))
    .filter((s) => s.items.length > 0);
}

// Returns an error message for the first thing wrong in the sections, or "".
export function firstSectionError(sections) {
  for (const s of sections) {
    const name = s.title.trim() || SECTION_TYPES[s.type].label;
    for (const it of s.items) {
      if (s.type === "videos" && it.url.trim() && !parseVideoUrl(it.url)) return `${name}: only YouTube or Vimeo links work.`;
      if (s.type === "map" && it.url.trim() && !parseMapUrl(it.url)) return `${name}: paste a Google Maps link.`;
      if (s.type === "links" && it.url.trim() && !safeUrl(it.url)) return `${name}: one of the links isn't valid.`;
    }
  }
  return "";
}
