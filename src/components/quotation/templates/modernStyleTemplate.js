import { pdfRichHtml as safeRichHtml } from "@/lib/richText";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { quillContentCss } from "@/lib/quillContentStyles";
import {
  escapeHtmlSafe as esc, contactIcon, moneySym, resolveTagline, parseJsonField, logoHtml as brandLogo, socialItemsFrom, socialIconsHtml,
  gstLines, pricingShown, milestoneRows, milestoneTiming, paymentTextHtml, addonPill, splitIncludes, includesPdfHtml, rateNoteHtml, discountLabelText,
} from "./templateShared";

// Modern Style — an editorial layout: a full-width hero (with the first picture behind the title when one is
// added), "prepared for / by" columns, a project statement, a picture strip, a clean scope-and-investment list,
// a totals panel, milestone cards and a dark closing band. Serif display type over a clean sans body, one accent colour.
// Up to 3 pictures: the first is the hero, the rest form the strip under the project statement.

export const MODERN_DEFAULT_ACCENT = "#b08d57";
const INK = "#121212";
const PAPER = "#f7f5f1";
const HAIRLINE = "#e7e3dc";
const MUTED = "#7a766f";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function durationText(it) {
  if (it.rate_type === "Per Day") return `${it.days || 1} Day${(it.days || 1) === 1 ? "" : "s"}`;
  if (it.rate_type === "Per Unit") return `${it.quantity || 1} Unit${(it.quantity || 1) === 1 ? "" : "s"}`;
  if (it.rate_type === "Per Event") return "Per Event";
  return "";
}

const lines = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

// A picture as a background so it always fills its box without stretching.
const photo = (url) => `background-image:url('${String(url).replace(/'/g, "%27")}');background-size:cover;background-position:center;background-repeat:no-repeat;`;

export function renderModernStyle(data) {
  const { workspace, quotation, client, event, items, currency, templateConfig } = data;
  const cfg = templateConfig || {};
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const accent = /^#[0-9a-f]{6}$/i.test(cfg.accent || "") ? cfg.accent : MODERN_DEFAULT_ACCENT;
  const showPrices = pricingShown(quotation);

  const vis = cfg.visibility || {};
  const shown = (key) => vis[key]?.pdf !== false;

  // ---- business ----
  const bizName = workspace?.name || "Business Name";
  const tagline = resolveTagline(workspace, cfg);
  const address = [workspace?.address, workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", ");
  const phone = workspace?.phone || "";
  const email = workspace?.email || "";
  const socialLinks = parseJsonField(quotation?.social_links_snapshot);
  const website = cfg.website || workspace?.website || socialLinks.website || "";
  const logo = brandLogo(workspace, { color: INK, size: 40 }).replace("<img ", '<img style="max-width:100%;max-height:100%;object-fit:contain;" ');

  // ---- document ----
  const quoteNumber = quotation?.quotation_number || "";
  const quoteDate = fmtDate(quotation?.quotation_date);
  const validUntil = fmtDate(quotation?.valid_until);

  // ---- client ----
  const clientName = client?.name || "Client Name";
  const clientAddressLines = [client?.address, [client?.city, client?.state].filter(Boolean).join(", "), client?.country].filter(Boolean);
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";

  const title = (quotation?.project_title || event?.title || "").trim() || (client?.name ? `Proposal for ${client.name}` : "Quotation");
  const summary = shown("project_summary") ? String(quotation?.project_summary || cfg.project_summary || "").trim() : "";

  // ---- pictures: first = hero, rest = strip ----
  const pics = (Array.isArray(cfg.images) ? cfg.images : []).filter((im) => im && im.url).slice(0, 3);
  const heroPic = pics[0] || null;
  const stripPics = pics.slice(1);

  // ---- small helpers ----
  const label = (text, color = accent) => `<div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2.6px;text-transform:uppercase;color:${color};">${esc(text)}</div>`;
  const sectionTitle = (text) => `<h2 class="sec-h" style="font-family:${SERIF};font-size:32px;font-weight:400;color:${INK};margin:0;line-height:1.15;">${esc(text)}</h2><div style="width:48px;height:2px;background:${accent};margin:14px 0 22px;"></div>`;
  const contact = (kind, text, color = "#3a3a3a") => (text ? `<div style="display:flex;gap:9px;align-items:flex-start;margin-top:6px;font-size:13px;line-height:1.45;color:${color};"><span style="flex-shrink:0;width:14px;margin-top:2px;">${contactIcon(kind, { size: 14, color: accent })}</span><span>${esc(text)}</span></div>` : "");
  const pad = "padding-left:64px;padding-right:64px;";

  // =================== HERO ===================
  const heroBg = heroPic
    ? `${photo(heroPic.url)}`
    : `background:${INK};`;
  const overlay = heroPic
    ? `<div style="position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.30) 38%, rgba(10,10,10,0.88) 100%);"></div>`
    : `<div style="position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;border:1px solid ${hexToRgba(accent, 0.45)};"></div>
       <div style="position:absolute;right:-40px;top:-40px;width:360px;height:360px;border-radius:50%;border:1px solid ${hexToRgba(accent, 0.28)};"></div>`;
  const metaCell = (k, v) => (v ? `<div><div style="font-size:10.5px;letter-spacing:2.2px;text-transform:uppercase;color:${hexToRgba("#ffffff", 0.62)};">${esc(k)}</div><div style="margin-top:6px;font-size:15px;color:#fff;font-weight:600;">${esc(v)}</div></div>` : "");

  const hero = `<div class="hero" style="position:relative;height:470px;overflow:hidden;font-family:${SANS};${heroBg}">
    ${overlay}
    <div style="position:absolute;left:0;right:0;top:0;${pad}padding-top:38px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:50px;height:50px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;padding:6px;overflow:hidden;">${logo}</div>
        <div><div style="font-size:15px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#fff;">${esc(bizName)}</div>${tagline ? `<div style="font-size:11.5px;color:${hexToRgba("#ffffff", 0.7)};margin-top:3px;">${esc(tagline)}</div>` : ""}</div>
      </div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;${pad}padding-bottom:42px;">
      <div style="display:flex;align-items:center;gap:14px;"><div style="width:42px;height:2px;background:${accent};"></div>${label("Quotation", accent)}</div>
      <div style="font-family:${SERIF};font-size:54px;font-weight:400;line-height:1.08;color:#fff;margin-top:18px;max-width:880px;">${esc(title)}</div>
      <div style="display:flex;gap:56px;margin-top:34px;padding-top:20px;border-top:1px solid ${hexToRgba("#ffffff", 0.28)};">
        ${metaCell("Quotation no.", quoteNumber)}${metaCell("Date", quoteDate)}${metaCell("Valid until", validUntil)}
      </div>
    </div>
  </div>`;

  // =================== PREPARED FOR / BY ===================
  const parties = `<section class="keep-together" style="${pad}margin-top:46px;display:grid;grid-template-columns:1.15fr 1fr;gap:0;font-family:${SANS};">
    <div style="padding-right:40px;">
      ${label("Prepared for")}
      <div style="font-family:${SERIF};font-size:30px;font-weight:400;color:${INK};margin-top:12px;line-height:1.2;">${esc(clientName)}</div>
      ${clientAddressLines.map((l) => `<div style="margin-top:4px;font-size:13.5px;color:#555;line-height:1.45;">${esc(l)}</div>`).join("")}
      <div style="margin-top:6px;">${contact("mail", clientEmail)}${contact("phone", clientPhone)}</div>
    </div>
    <div style="padding-left:40px;border-left:1px solid ${HAIRLINE};">
      ${label("Prepared by")}
      <div style="font-size:18px;font-weight:700;color:${INK};margin-top:12px;">${esc(bizName)}</div>
      <div style="margin-top:6px;">${contact("pin", address)}${contact("phone", phone)}${contact("mail", email)}${contact("globe", website)}</div>
    </div>
  </section>`;

  // =================== PROJECT STATEMENT ===================
  const statement = summary
    ? `<section class="keep-together" style="${pad}margin-top:44px;font-family:${SANS};">
        ${label("About the project")}
        <div style="margin-top:14px;padding-left:22px;border-left:3px solid ${accent};font-family:${SERIF};font-size:21px;line-height:1.62;color:#2d2d2d;white-space:pre-line;">${esc(summary)}</div>
      </section>`
    : "";

  // =================== PICTURE STRIP ===================
  const tile = (im, h) => `<div style="position:relative;height:${h}px;border-radius:8px;overflow:hidden;${photo(im.url)}">${im.caption ? `<div style="position:absolute;left:0;right:0;bottom:0;padding:22px 16px 12px;background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.65));color:#fff;font-size:12px;letter-spacing:.4px;">${esc(im.caption)}</div>` : ""}</div>`;
  const strip = stripPics.length
    ? `<section class="keep-together" style="${pad}margin-top:40px;">${stripPics.length === 1 ? tile(stripPics[0], 300) : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">${stripPics.map((im) => tile(im, 280)).join("")}</div>`}</section>`
    : "";

  // =================== SCOPE & INVESTMENT ===================
  const { main: mainItems, includes: includeItems } = splitIncludes(items);
  const cols = showPrices ? "56px 1fr 120px 170px" : "56px 1fr 120px";
  const itemRows = mainItems.map((it, i) => {
    const bullets = lines(it.description);
    const dur = durationText(it);
    return `<div class="keep-together" style="display:grid;grid-template-columns:${cols};gap:18px;align-items:start;padding:20px 0;border-bottom:1px solid ${HAIRLINE};">
      <div style="font-family:${SERIF};font-size:26px;color:${accent};line-height:1;padding-top:2px;">${String(i + 1).padStart(2, "0")}</div>
      <div>
        <div style="font-size:16.5px;font-weight:700;color:${INK};line-height:1.35;">${esc(it.name || "")}${addonPill(it)}</div>
        ${bullets.length ? `<div style="margin-top:7px;font-size:12.8px;line-height:1.6;color:#666;">${bullets.map((l) => `<div style="display:flex;gap:8px;"><span style="color:${accent};">&ndash;</span><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
      </div>
      <div style="text-align:center;padding-top:2px;">${dur ? `<span style="display:inline-block;padding:5px 12px;border-radius:14px;background:${PAPER};border:1px solid ${HAIRLINE};font-size:11.5px;color:#555;">${esc(dur)}</span>` : ""}</div>
      ${showPrices ? `<div style="text-align:right;font-size:16px;font-weight:700;color:${INK};white-space:nowrap;padding-top:1px;">${moneySym(it.line_total, symbol)}${rateNoteHtml(it, symbol)}</div>` : ""}
    </div>`;
  }).join("");
  const itemsHead = `<div style="display:grid;grid-template-columns:${cols};gap:18px;padding:0 0 10px;border-bottom:1.5px solid ${INK};font-size:10.5px;letter-spacing:2.2px;text-transform:uppercase;color:${MUTED};font-weight:700;">
    <div>No.</div><div>Scope</div><div style="text-align:center;">Duration</div>${showPrices ? `<div style="text-align:right;">Amount (${esc(currency || "INR")})</div>` : ""}
  </div>`;
  const includesBlock = includesPdfHtml(includeItems, { symbol, showPrices, accent });
  const scope = `<section style="${pad}margin-top:54px;font-family:${SANS};">
    ${sectionTitle(showPrices ? "Scope & Investment" : "Scope of Work")}
    ${itemsHead}
    ${itemRows || `<div style="padding:22px 0;color:${MUTED};font-size:14px;">No items added.</div>`}
    ${includesBlock}
  </section>`;

  // =================== PAYMENT + TOTALS ===================
  const subtotal = quotation?.subtotal || 0;
  const discountAmount = Number(quotation?.discount_amount) || 0;
  const grandTotal = quotation?.grand_total || 0;
  const row = (l, v, extra = "") => `<div class="keep-together" style="display:flex;justify-content:space-between;gap:20px;padding:11px 20px;border-bottom:1px solid ${HAIRLINE};font-size:13.5px;color:#444;${extra}"><span style="letter-spacing:.4px;">${l}</span><span style="font-weight:600;color:${INK};">${v}</span></div>`;
  const totals = showPrices
    ? `<div class="keep-together" style="border-radius:10px;overflow:hidden;border:1px solid ${HAIRLINE};background:${PAPER};">
        ${row("Subtotal", moneySym(subtotal, symbol))}
        ${discountAmount > 0 ? row(esc(discountLabelText(quotation, "Discount")), `- ${moneySym(discountAmount, symbol)}`, "color:#b3402f;") : ""}
        ${gstLines(quotation, items).map((l) => row(esc(l.label), moneySym(l.amount, symbol))).join("")}
        <div style="background:${INK};padding:20px 20px 22px;">
          <div style="font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:${accent};font-weight:700;">Total investment</div>
          <div style="font-family:${SERIF};font-size:36px;color:#fff;margin-top:8px;line-height:1.1;">${moneySym(grandTotal, symbol)}</div>
        </div>
      </div>`
    : "";

  const bank = parseJsonField(quotation?.bank_details_snapshot);
  const bankRows = [["Account name", bank.account_name], ["Bank", bank.bank_name], ["Account no.", bank.account_number], ["IFSC", bank.ifsc], ["UPI ID", bank.upi_id]].filter(([, v]) => v);
  const hasBank = shown("bank") && bankRows.length > 0;
  const payMethod = [cfg.payment?.method || "Bank Transfer / UPI / Cheque", cfg.payment?.instructions || "Details will be shared upon confirmation."].filter(Boolean).map((l) => paymentTextHtml(l)).join("<br>");
  const paymentCol = `<div class="keep-together">
      ${label("Payment")}
      ${hasBank
        ? `<div style="margin-top:14px;">${bankRows.map(([k, v]) => `<div style="display:flex;gap:14px;padding:8px 0;border-bottom:1px solid ${HAIRLINE};font-size:13.5px;"><span style="width:120px;flex-shrink:0;color:${MUTED};">${esc(k)}</span><span style="font-weight:600;color:${INK};">${esc(v)}</span></div>`).join("")}</div>`
        : shown("payment_method") ? `<div style="margin-top:14px;font-size:14px;line-height:1.65;color:#444;">${payMethod}</div>` : ""}
    </div>`;
  const payTotals = `<section style="${pad}margin-top:40px;display:grid;grid-template-columns:${showPrices ? "1fr 1fr" : "1fr"};gap:48px;align-items:start;font-family:${SANS};">${paymentCol}${totals}</section>`;

  // =================== MILESTONE CARDS ===================
  const schedule = shown("payment_schedule") ? milestoneRows(quotation) : [];
  const scheduleHtml = schedule.length
    ? `<section style="${pad}margin-top:54px;font-family:${SANS};">
        ${sectionTitle("Payment Schedule")}
        <div style="display:grid;grid-template-columns:${schedule.length === 2 || schedule.length === 4 ? "1fr 1fr" : "1fr 1fr 1fr"};gap:16px;">
          ${schedule.map((m, i) => {
            const pct = m.type === "percent" ? `${Number(m.value) || 0}%` : "";
            const timing = milestoneTiming(m, fmtDate);
            return `<div class="keep-together" style="border:1px solid ${HAIRLINE};border-top:3px solid ${accent};border-radius:8px;background:${PAPER};padding:18px 18px 16px;">
              <div style="font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};font-weight:700;">Step ${String(i + 1).padStart(2, "0")}</div>
              ${pct ? `<div style="font-family:${SERIF};font-size:34px;color:${accent};margin-top:8px;line-height:1;">${esc(pct)}</div>` : ""}
              <div style="font-size:14.5px;font-weight:700;color:${INK};margin-top:10px;line-height:1.35;">${esc(m.name || "Payment")}</div>
              ${timing ? `<div style="font-size:12px;color:#777;margin-top:4px;line-height:1.4;">${esc(timing)}</div>` : ""}
              ${showPrices ? `<div style="font-size:15px;font-weight:700;color:${INK};margin-top:12px;padding-top:10px;border-top:1px dashed ${HAIRLINE};">${moneySym(m.calculated_amount, symbol)}</div>` : ""}
            </div>`;
          }).join("")}
        </div>
      </section>`
    : "";

  // =================== NOTES & TERMS ===================
  const notes = lines(quotation?.special_notes);
  const notesHtml = shown("special_notes") && notes.length ? `<ul style="margin:0;padding-left:20px;">${notes.map((l) => `<li style="margin-bottom:6px;">${esc(l)}</li>`).join("")}</ul>` : "";
  const payCondHtml = shown("payment_conditions") ? safeRichHtml(quotation?.payment_conditions) : "";
  const termsHtml = shown("terms") ? safeRichHtml(quotation?.terms_and_conditions) : "";
  const block = (heading, html, small = false) => `<div style="margin-bottom:24px;"><div style="width:28px;height:2px;background:${accent};margin-bottom:12px;"></div>${label(heading, INK)}<div class="rt" style="margin-top:12px;font-size:${small ? 11.5 : 13}px;line-height:1.65;color:#444;">${html}</div></div>`;
  const leftNotes = `${notesHtml ? block("Special notes", notesHtml) : ""}${payCondHtml ? block("Payment conditions", payCondHtml) : ""}`;
  const rightNotes = termsHtml ? block("Terms & conditions", termsHtml, true) : "";
  const notesSection = leftNotes || rightNotes
    ? `<section style="${pad}margin-top:50px;display:grid;grid-template-columns:${leftNotes && rightNotes ? "1fr 1fr" : "1fr"};gap:48px;align-items:start;font-family:${SANS};"><div>${leftNotes}</div>${rightNotes ? `<div>${rightNotes}</div>` : ""}</section>`
    : "";

  // =================== CLOSING BAND ===================
  const socialItems = shown("social") ? socialItemsFrom(socialLinks) : [];
  const footerMessage = shown("footer") ? (quotation?.footer_message || "") : "";
  const thankYou = cfg.thank_you || "Thank you";
  const closing = `<footer class="closing" style="margin-top:64px;background:${INK};${pad}padding-top:46px;padding-bottom:40px;font-family:${SANS};">
    <div style="display:grid;grid-template-columns:1.1fr 1.2fr 1fr;gap:40px;align-items:start;">
      <div class="keep-together">
        <div style="font-family:${SERIF};font-size:34px;font-style:italic;color:#fff;line-height:1.15;">${esc(thankYou)}</div>
        <div style="width:44px;height:2px;background:${accent};margin-top:16px;"></div>
      </div>
      <div class="keep-together" style="font-size:12.8px;line-height:1.7;color:${hexToRgba("#ffffff", 0.78)};">${footerMessage ? esc(footerMessage).replace(/\n/g, "<br>") : esc(bizName)}</div>
      <div class="keep-together" style="text-align:right;">
        ${socialItems.length ? `<div class="social-icons" style="display:flex;gap:9px;justify-content:flex-end;">${socialIconsHtml(socialItems, "m-social")}</div>` : ""}
        <div style="margin-top:${socialItems.length ? 16 : 0}px;font-size:12px;line-height:1.7;color:${hexToRgba("#ffffff", 0.7)};">${[phone, email, website].filter(Boolean).map(esc).join("<br>")}</div>
      </div>
    </div>
    ${cfg.developer_credit ? `<div style="margin-top:30px;padding-top:16px;border-top:1px solid ${hexToRgba("#ffffff", 0.16)};text-align:center;font-size:11px;color:${hexToRgba("#ffffff", 0.45)};">developed by ${esc(cfg.developer_credit)}</div>` : ""}
  </footer>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Quotation ${esc(quoteNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${SANS}; color: #1c1c1c; background: #ffffff; }
  .quotation { width: 1120px; margin: 0 auto; background: #ffffff; }
  .rt p { margin: 0 0 8px; }
  .rt ul, .rt ol { padding-left: 20px; margin: 0 0 8px; }
  .rt li { margin-bottom: 4px; }
  .m-social { width: 30px; height: 30px; border: 1px solid ${hexToRgba(accent, 0.8)}; color: #ffffff; border-radius: 50%; display: grid; place-items: center; }
  ${quillContentCss}
</style></head>
<body>
  <div class="quotation" id="quotation">
    ${hero}
    ${parties}
    ${statement}
    ${strip}
    ${scope}
    ${payTotals}
    ${scheduleHtml}
    ${notesSection}
    ${closing}
  </div>
</body></html>`;
}
