// The code a business pastes on its own website to show its inquiry form: a placeholder and one small script
// (public/embed.js), which adds the form, resizes it to fit and tells it which website it is on. The form only
// shows on the business's own website; see supabase/functions/_shared/embedOrigin.ts.

export const EMBED_HEIGHT_MESSAGE = "kramasha-embed-height";

// Optional look of the form so it matches the website: { transparent, text, accent, fields }. Colours are #rrggbb;
// anything else is ignored. It travels in the web address (and as data-* attributes for the loader), so nothing is
// stored on the server.
const HEX = /^#?([0-9a-f]{6})$/i;
export const cleanHex = (v) => { const m = HEX.exec(String(v || "").trim()); return m ? "#" + m[1].toLowerCase() : ""; };

export function embedStyleQuery(style) {
  const q = new URLSearchParams();
  if (style?.transparent) q.set("bg", "transparent");
  for (const k of ["text", "accent", "fields"]) { const c = cleanHex(style?.[k]); if (c) q.set(k, c); }
  const str = q.toString();
  return str ? "?" + str : "";
}

export function inquiryEmbedUrl(origin, slug, style) {
  return `${origin}/embed/inquiry/${slug}${embedStyleQuery(style)}`;
}

export function inquiryEmbedSnippet(origin, slug, style) {
  const attrs = [];
  if (style?.transparent) attrs.push('data-bg="transparent"');
  for (const k of ["text", "accent", "fields"]) { const c = cleanHex(style?.[k]); if (c) attrs.push(`data-${k}="${c}"`); }
  return `<div data-kramasha-inquiry="${slug}"${attrs.length ? " " + attrs.join(" ") : ""}></div>\n<script async src="${origin}/embed.js"></script>`;
}

// "#rrggbb" to the "H S% L%" form the app's colour variables use.
export function hexToHsl(hex) {
  const c = cleanHex(hex);
  if (!c) return null;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h: Math.round(h), s: Math.round(sat * 100), l: Math.round(l * 100) };
}
const hsl = ({ h, s, l }) => `${h} ${s}% ${l}%`;

// The colour variables (and the flat-card switch) the embed page applies for a style read from its web address.
export function embedStyleVars(search) {
  const q = new URLSearchParams(search);
  const vars = {};
  const text = hexToHsl(q.get("text"));
  if (text) {
    vars["--foreground"] = vars["--card-foreground"] = hsl(text);
    vars["--muted-foreground"] = hsl({ ...text, l: Math.round(text.l + (50 - text.l) * 0.3) });
    vars["--border"] = vars["--input"] = hsl({ ...text, l: Math.round(text.l + (50 - text.l) * 0.75) });
  }
  const accent = hexToHsl(q.get("accent"));
  if (accent) {
    vars["--primary"] = vars["--accent"] = vars["--ring"] = hsl(accent);
    vars["--primary-hover"] = hsl({ ...accent, l: Math.max(0, accent.l - 6) });
    vars["--primary-foreground"] = vars["--accent-foreground"] = accent.l > 60 ? "220 26% 14%" : "0 0% 100%";
  }
  const fields = hexToHsl(q.get("fields"));
  if (fields) vars["--card"] = hsl(fields);
  return { vars, flat: q.get("bg") === "transparent" };
}

// For website builders that allow only an iframe (no script). It works the same, but the height is fixed.
export function inquiryEmbedIframeSnippet(origin, slug, style) {
  return `<iframe src="${inquiryEmbedUrl(origin, slug, style)}" title="Send an inquiry" style="width:100%;max-width:760px;height:760px;border:0;display:block;margin:0 auto;background:transparent" referrerpolicy="origin"></iframe>`;
}

// The pages above the form, nearest first, as the browser reports them. Chrome and Safari list them directly;
// Firefox only gives the page that framed the form (its address is sent because the loader asks for it).
export function detectEmbedContext() {
  const framed = window.parent !== window;
  let ancestors = [];
  try {
    const list = window.location.ancestorOrigins;
    if (list && list.length) ancestors = Array.from(list);
  } catch { /* not available */ }
  if (framed && !ancestors.length && document.referrer) {
    try { ancestors = [new URL(document.referrer).origin]; } catch { /* unreadable */ }
  }
  return { framed, ancestors };
}
