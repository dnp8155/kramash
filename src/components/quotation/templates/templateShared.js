// Pieces every quotation PDF template needs, so the four templates agree on the details:
// exact money (2 decimals, Indian grouping), the business tagline, real social icons,
// a correct GST breakdown, and the payment schedule.

import { richHtmlToText } from "@/lib/richText";
import { calculateMilestones, round2, effectiveUnits, isIncludeItem } from "@/lib/quotationCalc";

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

// Small "2 × 3 days × ₹5,000.00" line under an item's amount, so the printed Qty/Days/Rate
// explains the amount. Shown only when it isn't simply one unit at the line price.
export function rateNoteHtml(it, symbol) {
  const units = effectiveUnits(it);
  const rate = Number(it?.unit_rate) || 0;
  if (units === 1 || rate <= 0) return "";
  const days = it?.rate_type === "Per Day" ? (Number(it?.days) || 1) : 0;
  const qty = Number(it?.quantity) || 0;
  const parts = [String(qty)];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  parts.push(moneySym(rate, symbol));
  return `<div style="font-size:10.5px;font-weight:400;color:#777;margin-top:3px;white-space:nowrap;">${escapeHtmlSafe(parts.join(" × "))}</div>`;
}

// "DISCOUNT (10%)" when the discount was set as a percentage, plain "DISCOUNT" for a fixed amount.
export function discountLabelText(quotation, base = "DISCOUNT") {
  const v = Number(quotation?.discount_value) || 0;
  return quotation?.discount_type !== "fixed" && v > 0 ? `${base} (${trimRate(v)}%)` : base;
}

// Payment instructions are typed as plain text, but may arrive as rich HTML from Preferences
// ("<p>Pay by UPI&nbsp;…</p>"). Turn either into clean, escaped text with line breaks.
export function paymentTextHtml(value) {
  return escapeHtmlSafe(richHtmlToText(value)).replace(/\n/g, "<br>");
}

// ---- Add-on marker + Includes / Deliverables ------------------------------------------------
export const ADDON_PILL = '<span style="display:inline-block;margin-left:6px;padding:1px 7px;border-radius:9px;background:#fff1d6;color:#a35f00;font-size:9.5px;font-weight:700;letter-spacing:.4px;vertical-align:middle;">ADD-ON</span>';
export const addonPill = (it) => (it?.is_addon ? ADDON_PILL : "");
export const splitIncludes = (items) => ({
  main: (items || []).filter((it) => !isIncludeItem(it)),
  includes: (items || []).filter(isIncludeItem),
});

// "INCLUDES" block under the scope table: each deliverable with its quantity, add-on marker and — when prices are
// shown — quantity × rate and the amount. Inline styles only, so no template's table CSS can change it.
export function includesPdfHtml(includes, { symbol, showPrices = true, accent = "#333" } = {}) {
  if (!includes?.length) return "";
  const rows = includes.map((it) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.unit_rate) || 0;
    const note = showPrices && qty !== 1 && rate > 0 ? `<div style="font-size:11px;color:#777;margin-top:2px;">${qty} × ${moneySym(rate, symbol)}</div>` : "";
    const desc = it.description ? `<div style="font-size:11px;color:#777;margin-top:2px;">${escapeHtmlSafe(it.description)}</div>` : "";
    const label = `${!showPrices && qty > 1 ? `${qty} × ` : ""}${escapeHtmlSafe(it.name || "Item")}`;
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:7px 6px;border-bottom:1px solid #e3e3e3;font-size:12.5px;line-height:1.4;text-align:left;">
      <div><span style="font-weight:600;">${label}</span>${addonPill(it)}${desc}${note}</div>
      ${showPrices ? `<div style="white-space:nowrap;font-weight:700;">${moneySym(it.line_total, symbol)}</div>` : ""}
    </div>`;
  }).join("");
  return `<div class="includes-block" style="margin-top:18px;page-break-inside:avoid;break-inside:avoid;text-align:left;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:${accent};margin-bottom:4px;">INCLUDES</div>
    ${rows}
  </div>`;
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

// ---- "Minimal black" look shared by the Classic Minimal quotation and the Simple B&W invoice ------------------
// Loaded AFTER each template's own CSS so these rules win. Plain properties only (they are rasterised with html2canvas).
export const minimalBlackCss = `
    body { color: #111; font-size: 13.5px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
    .quotation-page, .invoice-page { padding: 44px 50px 34px; }
    .header { border-bottom: 3px solid #111; padding-bottom: 18px; gap: 24px; align-items: center; }
    .header-logo { width: 68px; height: 68px; }
    .header-brand-name { font-size: 21px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.2; }
    .header-tagline { font-size: 12px; color: #555; font-style: italic; margin-top: 3px; }
    /* Contact block: sits top-right, but its own lines are left-aligned with the icons in one tidy column. */
    .header-contact { font-size: 12.5px; line-height: 1.45; color: #333; text-align: left; width: 270px; flex-shrink: 0; }
    .contact-line { display: flex; align-items: flex-start; justify-content: flex-start; gap: 9px; margin-top: 6px; text-align: left; }
    .contact-line:first-child { margin-top: 0; }
    .contact-line img { flex-shrink: 0; margin-top: 2px; }
    .contact-line span { flex: 1; min-width: 0; line-height: 1.45; overflow-wrap: anywhere; }
    .doc-banner { display: flex; justify-content: space-between; align-items: center; background: #111; color: #fff; padding: 13px 20px; margin: 22px 0 12px; }
    .doc-banner-title { font-size: 19px; font-weight: 800; letter-spacing: 4px; }
    .doc-banner-no { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
    .meta-row { display: flex; justify-content: space-between; gap: 16px; margin: 0 0 6px; padding: 10px 2px; border-bottom: 1px solid #ddd; font-size: 12.5px; color: #333; }
    .meta-row strong { color: #111; }
    .section-title { font-size: 11.5px; font-weight: 800; letter-spacing: 2.2px; text-transform: uppercase; text-decoration: none; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin: 28px 0 12px; }
    .detail-line { margin-bottom: 6px; font-size: 13.5px; }
    .detail-label { font-weight: 700; }
    .day-block { border-left: 3px solid #111; padding: 2px 0 2px 16px; margin-bottom: 18px; }
    .day-heading { font-size: 12.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px; }
    .items-table { margin-top: 6px; }
    .items-table th { background: #111; color: #fff; border-bottom: none; padding: 10px 12px; font-size: 11px; letter-spacing: 1.2px; }
    .items-table td { border-bottom: 1px solid #e3e3e3; padding: 11px 12px; }
    .items-table .col-num { color: #777; }
    .item-desc { font-size: 12px; color: #666; margin-top: 3px; }
    .totals-box, .pricing-box { margin-top: 18px; }
    .totals-box { width: 340px; margin-left: auto; }
    .total-row { padding: 7px 2px; border-bottom: 1px solid #e3e3e3; font-size: 13.5px; }
    .total-row.grand { background: #111; color: #fff; border: none; padding: 12px 14px; margin-top: 8px; font-size: 16px; font-weight: 800; }
    .pricing-table { max-width: 380px; margin-left: auto; }
    .pricing-table td { padding: 6px 2px; border-bottom: 1px solid #e3e3e3; }
    .pricing-table .grand td { background: #111; color: #fff; border: none; padding: 12px 14px; font-size: 16px; }
    .amount-words { margin-top: 10px; font-size: 12.5px; color: #444; text-align: right; }
    .terms-small, .terms-small li, .terms-small p { font-size: 10.5px !important; line-height: 1.4 !important; }
    .payment-text, .terms-content { font-size: 13px; line-height: 1.6; }
    .signed-block { margin-top: 34px; }
    .footer { margin-top: 36px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11.5px; color: #777; }
`;

// Compact header stamped at the top of every page after the first (see generateTemplatePdf).
export function runningHeaderHtml({ logoUrl = "", name = "", label = "", number = "", showLogo = true } = {}) {
  const logo = showLogo && logoUrl
    ? `<img src="${escapeHtmlSafe(logoUrl)}" alt="" style="height:34px;width:auto;max-width:90px;object-fit:contain;margin-right:12px;" />`
    : "";
  return `<div id="pdf-running-header" style="display:none"><div style="font-family:Arial,Helvetica,sans-serif;padding:8px 50px 6px;background:#fff;border-bottom:2px solid #111;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="vertical-align:middle;">${logo ? `<span style="display:inline-block;vertical-align:middle;">${logo}</span>` : ""}<span style="display:inline-block;vertical-align:middle;font-size:15px;font-weight:800;color:#111;">${escapeHtmlSafe(name)}</span></td>
      <td style="vertical-align:middle;text-align:right;font-size:12px;color:#444;"><span style="letter-spacing:2px;font-weight:700;color:#111;">${escapeHtmlSafe(String(label).toUpperCase())}</span>${number ? ` &nbsp;<span style="font-weight:700;color:#111;">${escapeHtmlSafe(number)}</span>` : ""}</td>
    </tr></table>
  </div></div>`;
}

// Picture band for templates that support up to 3 pictures. `images` are already-loaded data URLs
// ({ url, caption }). 1 picture = full width, 2 = side by side, 3 = one large + two stacked.
export function galleryHtml(images, { radius = 10, gap = 10, margin = "18px 0 0" } = {}) {
  const list = (Array.isArray(images) ? images : []).filter((im) => im && im.url).slice(0, 3);
  if (!list.length) return "";
  const pic = (im, height, extra = "") => `<div style="position:relative;overflow:hidden;border-radius:${radius}px;height:${height}px;${extra}"><img src="${escapeHtmlSafe(im.url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />${im.caption ? `<div style="position:absolute;left:0;right:0;bottom:0;padding:6px 10px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;">${escapeHtmlSafe(im.caption)}</div>` : ""}</div>`;
  let body;
  if (list.length === 1) body = pic(list[0], 260);
  else if (list.length === 2) body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${gap}px;">${pic(list[0], 220)}${pic(list[1], 220)}</div>`;
  else body = `<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:${gap}px;">${pic(list[0], 240 + gap)}<div style="display:grid;grid-template-rows:1fr 1fr;gap:${gap}px;">${pic(list[1], 115)}${pic(list[2], 115)}</div></div>`;
  return `<section style="margin:${margin};page-break-inside:avoid;">${body}</section>`;
}
