// Pieces every quotation PDF template needs, so the four templates agree on the details:
// exact money (2 decimals, Indian grouping), the business tagline, real social icons,
// a correct GST breakdown, and the payment schedule.

import { calculateMilestones, round2 } from "@/lib/quotationCalc";

export function escapeHtmlSafe(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 2 decimals always: 265356.45 -> "2,65,356.45". (Whole-rupee rounding made printed rows
// disagree with the total by ₹1.)
export function fmt2(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function moneySym(n, symbol) {
  return `${symbol} ${fmt2(n)}`;
}

// The business's own tagline (from Preferences), or one set on this quotation. Empty when
// none is set — no invented slogan.
export function resolveTagline(workspace, cfg) {
  return String(cfg?.tagline || workspace?.tagline || "").trim();
}

export function resolveWebsite(workspace, cfg, socialLinks) {
  return cfg?.website || workspace?.website || socialLinks?.website || "";
}

export function parseJsonField(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value) || {}; } catch { return {}; }
}

// Business logo, or (when there is none) a monogram — never the word "LOGO".
export function logoHtml(workspace, { color = "#333", size = 44 } = {}) {
  if (workspace?.logo) return `<img src="${escapeHtmlSafe(workspace.logo)}" alt="${escapeHtmlSafe(workspace?.name || "Logo")}" />`;
  const initial = escapeHtmlSafe((workspace?.name || "K").trim().charAt(0).toUpperCase());
  return `<div style="width:100%;height:100%;min-width:${size}px;min-height:${size}px;display:grid;place-items:center;color:${color};font-size:${Math.round(size * 0.5)}px;font-weight:700;border:1.5px solid ${color};border-radius:10px;">${initial}</div>`;
}

// ---- Contact icons (phone / email / address / website), inline SVG ------------------------
const C = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};
// kind: phone | mail | pin | globe.  `color` is a literal colour (the icon is an image, so
// currentColor is not available). inline: sits in a line of text (client details); otherwise it
// fills an icon slot (business header rows).
// Drawn as an <img> rather than inline <svg>: html2canvas positions inline SVG a few pixels off
// inside flex rows, and the PDF must show the icons exactly on the text line.
export function contactIcon(kind, { size = 16, inline = false, color = "#333" } = {}) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='${size * 4}' height='${size * 4}' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${C[kind] || C.globe}</svg>`.replace(/"/g, "'");
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const style = inline
    ? `display:inline-block;width:${size}px;height:${size}px;vertical-align:-${Math.round(size * 0.22)}px;margin-right:7px;`
    : `display:block;width:${size}px;height:${size}px;`;
  return `<img data-contact-icon src="${src}" alt="" width="${size}" height="${size}" style="${style}" />`;
}

// ---- Social icons: real glyphs (inline SVG), not "ig"/"yt" letters -------------------
const P = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
  website: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" fill="none" stroke="currentColor" stroke-width="2"/>',
  x: '<path d="M4 4l16 16M20 4 4 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5A.5.5 0 0 1 14 8z" fill="currentColor"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10v6M8 7.5v.01M12 16v-6M12 12.5a2.5 2.5 0 0 1 5 0V16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.4 2 4 4.5 4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  whatsapp: '<path d="M4 20l1.4-4.1A8 8 0 1 1 8.2 18.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 9c.5 2.5 2.5 4.5 5 5l1.2-1.2-1.6-.9-.8.6c-.9-.4-1.6-1.1-2-2l.6-.8-.9-1.6z" fill="currentColor"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const LABELS = { instagram: "Instagram", youtube: "YouTube", website: "Website", x: "X", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", whatsapp: "WhatsApp", link: "Link" };

export function socialItemsFrom(links) {
  const l = links || {};
  const out = [];
  if (l.instagram) out.push({ key: "instagram", url: l.instagram });
  if (l.youtube) out.push({ key: "youtube", url: l.youtube });
  if (l.website) out.push({ key: "website", url: l.website });
  if (l.twitter || l.portfolio) out.push({ key: "x", url: l.twitter || l.portfolio });
  (Array.isArray(l.extra) ? l.extra : []).forEach((s) => {
    if (s?.url) out.push({ key: P[s.icon] ? s.icon : "link", url: s.url });
  });
  return out;
}

// `cls` is the template's own circle class (size/colour come from its CSS).
export function socialIconsHtml(items, cls = "social-circle") {
  return items
    .map((s) => `<a href="${escapeHtmlSafe(s.url)}" class="${cls}" title="${escapeHtmlSafe(LABELS[s.key] || "Link")}" aria-label="${escapeHtmlSafe(LABELS[s.key] || "Link")}"><svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">${P[s.key] || P.link}</svg></a>`)
    .join("");
}

// ---- GST: labelled by what was actually charged ---------------------------------------
const trimRate = (r) => (Number.isInteger(r) ? String(r) : String(round2(r)));

// [{ label, amount }] — e.g. CGST (9%) + SGST (9%), or IGST (18%). With mixed item rates the
// label lists them: CGST (2.5% / 9%). Empty when GST isn't applied.
export function gstLines(quotation, items) {
  if (!quotation?.gst_applicable) return [];
  const total = Number(quotation.gst_total) || 0;
  const rates = [...new Set((items || []).map((it) => Number(it.gst_rate) || 0).filter((r) => r > 0))].sort((a, b) => a - b);
  const taxable = Number(quotation.taxable_amount) || 0;
  const blended = rates.length === 0 && total > 0 && taxable > 0 ? [round2((total / taxable) * 100)] : rates;
  const igst = quotation.gst_mode === "igst";
  const cgst = Number(quotation.cgst_amount) || 0;
  const sgst = Number(quotation.sgst_amount) || 0;
  const igstAmt = Number(quotation.igst_amount) || 0;
  const rateText = (list) => (list.length ? ` (${list.map(trimRate).join("% / ")}%)` : "");

  if (igst) return [{ label: `IGST${rateText(blended)}`, amount: igstAmt || total }];
  if (cgst || sgst) {
    const half = blended.map((r) => r / 2);
    return [
      { label: `CGST${rateText(half)}`, amount: cgst },
      { label: `SGST${rateText(half)}`, amount: sgst },
    ];
  }
  return [{ label: `GST${rateText(blended)}`, amount: total }];
}

// ---- Prices as set in the editor: "Show pricing" off hides the rate/amount columns --------
export function pricingShown(quotation) {
  return quotation?.show_pricing !== false;
}

// ---- Payment schedule (milestones) ------------------------------------------------------
export function milestoneRows(quotation) {
  let list = quotation?.milestones;
  if (!Array.isArray(list)) list = parseArray(quotation?.payment_schedule_json);
  const grand = Number(quotation?.grand_total) || 0;
  return calculateMilestones(list, grand).filter((m) => (m.name || "").trim() || m.calculated_amount > 0);
}
function parseArray(v) {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v || "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
}

const TIMING = { on_signing: "On signing", event_day: "On event day", day_after_event: "Day after event" };
// "When" text exactly as set on the quotation's milestone: its own condition wording first
// (e.g. "On signing"), then its date or due type — never invented.
export function milestoneTiming(m, fmtDate) {
  const condition = String(m.due_condition || "").trim();
  const date = m.due_date ? (fmtDate ? fmtDate(m.due_date) : m.due_date) : "";
  const type = TIMING[m.due_date_type] || "";
  const parts = [condition || type, date].filter(Boolean);
  return [...new Set(parts)].join(" · ");
}

// Ready-to-insert block. `accent` = the template's accent colour; fonts inherit.
// Built from divs (not a <table>) with inline styles so no template's table CSS can alter it.
export function paymentScheduleHtml(quotation, { symbol, accent = "#333", fmtDate, title = "PAYMENT SCHEDULE" } = {}) {
  const rows = milestoneRows(quotation);
  if (rows.length === 0) return "";
  const cell = "padding:7px 6px;border-bottom:1px solid #e3e3e3;";
  const body = rows.map((m) => {
    const pct = m.type === "percent" ? `${trimRate(Number(m.value) || 0)}%` : "";
    const timing = milestoneTiming(m, fmtDate);
    return `<div style="display:grid;grid-template-columns:1fr 64px 130px;align-items:start;font-size:12.5px;line-height:1.4;text-align:left;">
      <div style="${cell}"><div style="font-weight:600;">${escapeHtmlSafe(m.name || "Payment")}</div>${timing ? `<div style="font-size:11px;color:#777;margin-top:2px;">${escapeHtmlSafe(timing)}</div>` : ""}</div>
      <div style="${cell}text-align:right;color:#555;">${pct}</div>
      <div style="${cell}text-align:right;white-space:nowrap;font-weight:700;">${moneySym(m.calculated_amount, symbol)}</div>
    </div>`;
  }).join("");
  return `<div class="payment-schedule" style="margin-top:18px;page-break-inside:avoid;break-inside:avoid;text-align:left;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:${accent};margin-bottom:4px;">${escapeHtmlSafe(title)}</div>
    ${body}
  </div>`;
}
