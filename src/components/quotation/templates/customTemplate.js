import { pdfRichHtml as safeRichHtml } from "@/lib/richText";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { quillContentCss } from "@/lib/quillContentStyles";
import { CUSTOM_FONTS, TERMS_SOURCES, normalizeCustom, outlineTitles } from "@/constants/customTemplate";
import {
  escapeHtmlSafe as esc, contactIcon, moneySym, parseJsonField, logoHtml as brandLogo, socialItemsFrom, socialIconsHtml,
  gstLines, pricingShown, splitIncludes, includesPdfHtml, addonPill, rateNoteHtml, discountLabelText, galleryHtml,
  milestoneRows, milestoneTiming, resolveTagline,
} from "./templateShared";

// The "Custom" quotation: the owner composes it from blocks (see constants/customTemplate.js). Everything that is
// a number or a list of items comes from the quotation itself; the rest is whatever the owner typed.
// Page furniture the PDF engine understands (see lib/quotationTemplatePdf.js):
//   #pdf-page-header / #pdf-page-footer  repeated on every page except the cover
//   .pdf-cover                           a full-page cover with no header / footer
//   .pdf-force-break                     "start a new page here"

const PAGE_W = 1120;
const PAGE_H = Math.round((PAGE_W * 297) / 210); // 1584 — one A4 page at the template's width
const SIDE = 60; // left / right page margin inside the content

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

// Plain text -> escaped HTML with line breaks.
const lines = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const br = (text) => esc(text).replace(/\n/g, "<br>");

function checkIcon(color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48' fill='none' stroke='${color}' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12.5l5 5L20 6.5'/></svg>`;
  return `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, "%27")}" alt="" width="14" height="14" style="display:block;width:14px;height:14px;" />`;
}

export function renderCustom(data) {
  const { workspace, quotation, client, event, items, currency, templateConfig } = data;
  const cfg = templateConfig || {};
  const custom = normalizeCustom(cfg.custom);
  const { theme, letterhead, blocks } = custom;
  const accent = /^#[0-9a-f]{6}$/i.test(theme.accent) ? theme.accent : "#b85a4e";
  const tint = hexToRgba(accent, 0.1);
  const font = CUSTOM_FONTS[theme.font] || CUSTOM_FONTS.clean;
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const showPrices = pricingShown(quotation);

  // ---- values available as {{tokens}} in any text the owner types ----
  const bizName = workspace?.name || "";
  const clientName = client?.name || "";
  const tokens = {
    business: bizName, client: clientName, number: quotation?.quotation_number || "",
    date: fmtDate(quotation?.quotation_date), project: quotation?.project_title || event?.title || "",
  };
  const fill = (text) => String(text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (tokens[k] !== undefined ? tokens[k] : ""));

  // ---- visibility toggles from the editor (Show in PDF) ----
  const vis = cfg.visibility || {};
  const shown = (key) => vis[key]?.pdf !== false;

  // ---- business details (fetched from the profile) ----
  const tagline = resolveTagline(workspace, cfg);
  const address = [workspace?.address, workspace?.city, workspace?.state].filter(Boolean).join(", ");
  const phone = workspace?.phone || "";
  const email = workspace?.email || "";
  const website = cfg.website || workspace?.website || "";
  const extraLines = (letterhead.extra || []).map((l) => String(l || "").trim()).filter(Boolean);

  // ---- headings ----
  const heading = (text, { first = false } = {}) => {
    const t = fill(text).trim();
    if (!t) return "";
    const base = `margin:${first ? 0 : 6}px 0 14px;`;
    if (theme.headingStyle === "underline") return `<h2 class="blk-h" style="${base}font-size:21px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${accent};padding-bottom:7px;border-bottom:2px solid ${accent};">${esc(t)}</h2>`;
    if (theme.headingStyle === "plain") return `<h2 class="blk-h" style="${base}font-size:21px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#1c1c1c;">${esc(t)}</h2>`;
    return `<h2 class="blk-h" style="${base}font-size:22px;font-weight:400;letter-spacing:.6px;text-transform:uppercase;color:#fff;background:${accent};padding:9px 16px;">${esc(t)}</h2>`;
  };
  const section = (inner, { gap = 26 } = {}) => `<section class="blk" style="padding:0 ${SIDE}px;margin-top:${gap}px;">${inner}</section>`;

  // ---- letterhead: header + footer drawn on every page except the cover ----
  const logoImg = brandLogo(workspace, { color: accent, size: 56 });
  const contactRow = (kind, text) => (text ? `<div style="display:flex;gap:8px;align-items:flex-start;margin-top:5px;font-size:13px;line-height:1.4;color:#333;"><span style="flex-shrink:0;width:15px;margin-top:2px;">${contactIcon(kind, { size: 15, color: accent })}</span><span>${esc(text)}</span></div>` : "");
  const hasFooter = letterhead.enabled && letterhead.footerLayout !== "none";

  let headerHtml = "";
  if (letterhead.enabled) {
    const contactInHeader = !hasFooter;
    const contactBlock = contactInHeader
      ? `<div style="min-width:250px;">${contactRow("phone", phone)}${contactRow("mail", email)}${contactRow("pin", address)}${contactRow("globe", website)}${extraLines.map((l) => `<div style="margin-top:5px;font-size:13px;color:#333;">${esc(l)}</div>`).join("")}</div>`
      : "";
    if (letterhead.headerLayout === "block") {
      headerHtml = `<div style="font-family:${font.css};background:#fff;padding:0 ${SIDE}px 0;">
        <div style="display:flex;align-items:stretch;gap:22px;">
          <div style="width:112px;flex-shrink:0;background:${accent};padding:0 14px 16px;display:flex;align-items:flex-end;"><div style="width:84px;height:84px;background:#fff;display:flex;align-items:center;justify-content:center;padding:8px;overflow:hidden;"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${logoImg.replace("<img ", '<img style="max-width:100%;max-height:100%;object-fit:contain;" ')}</div></div></div>
          <div style="flex:1;padding:26px 0 16px;display:flex;flex-direction:column;justify-content:flex-end;">
            <div style="font-size:30px;font-weight:300;letter-spacing:7px;color:${accent};line-height:1.15;text-transform:lowercase;">${esc(bizName)}</div>
            ${tagline ? `<div style="font-size:13px;color:#666;margin-top:6px;">${esc(tagline)}</div>` : ""}
          </div>
          ${contactBlock ? `<div style="padding-top:30px;">${contactBlock}</div>` : ""}
        </div>
        <div style="height:2px;background:${accent};"></div><div style="height:22px;background:#fff;"></div>
      </div>`;
    } else if (letterhead.headerLayout === "center") {
      headerHtml = `<div style="font-family:${font.css};background:#fff;padding:30px ${SIDE}px 0;text-align:center;">
        <div style="width:70px;height:70px;margin:0 auto 10px;">${logoImg.replace("<img ", '<img style="max-width:100%;max-height:100%;object-fit:contain;" ')}</div>
        <div style="font-size:28px;font-weight:700;letter-spacing:2px;color:${accent};text-transform:uppercase;">${esc(bizName)}</div>
        ${tagline ? `<div style="font-size:13px;color:#666;margin-top:5px;">${esc(tagline)}</div>` : ""}
        ${contactInHeader ? `<div style="font-size:12.5px;color:#444;margin-top:8px;">${[phone, email, address, website, ...extraLines].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ")}</div>` : ""}
        <div style="height:2px;background:${accent};margin-top:16px;"></div><div style="height:22px;background:#fff;"></div>
      </div>`;
    } else {
      headerHtml = `<div style="font-family:${font.css};background:#fff;padding:30px ${SIDE}px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;">
          <div style="display:flex;align-items:center;gap:16px;"><div style="width:64px;height:64px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${logoImg.replace("<img ", '<img style="max-width:100%;max-height:100%;object-fit:contain;" ')}</div>
            <div><div style="font-size:26px;font-weight:700;color:${accent};line-height:1.15;">${esc(bizName)}</div>${tagline ? `<div style="font-size:13px;color:#666;margin-top:4px;">${esc(tagline)}</div>` : ""}</div></div>
          ${contactBlock}
        </div>
        <div style="height:3px;background:${accent};margin-top:18px;"></div><div style="height:22px;background:#fff;"></div>
      </div>`;
    }
  }

  let footerHtml = "";
  if (hasFooter) {
    const tag = fill(letterhead.footerTagline || "").trim();
    const tagHtml = tag ? `<div style="text-align:center;font-size:14px;letter-spacing:.8px;color:${accent};font-weight:600;padding:9px 0 12px;border-top:1px solid ${hexToRgba(accent, 0.4)};margin-top:8px;">${esc(tag)}</div>` : `<div style="height:10px;"></div>`;
    if (letterhead.footerLayout === "center") {
      footerHtml = `<div style="font-family:${font.css};background:#fff;padding:14px ${SIDE}px 0;text-align:center;">
        <div style="height:1px;background:${hexToRgba(accent, 0.55)};margin-bottom:10px;"></div>
        ${extraLines.length ? `<div style="font-size:13px;color:#333;margin-bottom:4px;">${extraLines.map(esc).join(" &nbsp;·&nbsp; ")}</div>` : ""}
        <div style="font-size:12.5px;color:#444;">${[phone, email, address, website].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ")}</div>
        ${tagHtml}
      </div>`;
    } else {
      const col = (inner, align = "left") => `<div style="flex:1;min-width:0;text-align:${align};">${inner}</div>`;
      footerHtml = `<div style="font-family:${font.css};background:#fff;padding:14px ${SIDE}px 0;">
        <div style="height:1px;background:${hexToRgba(accent, 0.55)};margin-bottom:12px;"></div>
        <div style="display:flex;gap:18px;align-items:flex-start;">
          ${extraLines.length ? col(extraLines.map((l) => `<div style="font-size:13px;color:#333;line-height:1.5;">${esc(l)}</div>`).join("")) : ""}
          ${col(`${contactRow("phone", phone)}${contactRow("globe", website)}`.replace("margin-top:5px;", "margin-top:0;"))}
          ${col(`${contactRow("mail", email)}${contactRow("pin", address)}`.replace("margin-top:5px;", "margin-top:0;"))}
        </div>
        ${tagHtml}
      </div>`;
    }
  }

  // ---- blocks ----
  const outline = outlineTitles(blocks);

  const renderCover = (b) => {
    const titleLines = fill(b.title || "").split("\n").join(" ").trim().split(/\s+/).reduce((acc, w) => {
      // two words per line at most, like "PROJECT / PROPOSAL"
      if (!acc.length || acc[acc.length - 1].split(" ").length >= 2) acc.push(w); else acc[acc.length - 1] += ` ${w}`;
      return acc;
    }, []);
    const loc = fill(b.location || "").trim() || [client?.city, client?.state].filter(Boolean).join(", ");
    const tags = lines(fill(b.tags));
    return `<div class="pdf-cover" style="font-family:${font.css};height:${PAGE_H}px;display:flex;background:#fff;overflow:hidden;">
      <div style="flex:1;min-width:0;padding:84px 0 0 100px;position:relative;">
        <div style="height:10px;background:${accent};"></div>
        <div style="padding:64px 40px 0 12px;">
          <div style="font-size:70px;line-height:1.08;font-weight:300;color:${accent};text-transform:uppercase;">${titleLines.map(esc).join("<br>")}</div>
          ${b.subtitle ? `<div style="margin-top:34px;font-size:24px;line-height:1.35;color:${accent};text-transform:uppercase;max-width:560px;">${br(fill(b.subtitle))}</div>` : ""}
          <div style="height:1px;background:#777;margin:42px 0 0;"></div>
          <div style="margin-top:34px;font-size:24px;color:${accent};text-transform:uppercase;">${esc(fill(b.forLabel || "FOR"))}</div>
          <div style="margin-top:14px;font-size:26px;font-weight:800;color:${accent};">${esc(clientName || "Client name")}</div>
          ${loc ? `<div style="margin-top:8px;font-size:23px;color:${accent};">${esc(loc)}</div>` : ""}
          <div style="margin-top:56px;font-size:19px;color:${accent};">Date: ${esc(tokens.date)}</div>
        </div>
        ${b.showOutline !== false && outline.length ? `<div style="margin:44px 0 0 -100px;padding-left:100px;"><div style="height:10px;background:${accent};"></div>
          <div style="padding:22px 12px 0;"><div style="font-size:22px;font-weight:800;color:${accent};letter-spacing:.5px;">PROPOSAL OUTLINE</div>
          <div style="margin-top:16px;">${outline.map((t, i) => `<div style="font-size:20px;color:${accent};line-height:1;padding:9px 0;">${i + 1}.&nbsp; ${esc(t)}</div>`).join("")}</div></div></div>` : ""}
        ${tags.length ? `<div style="position:absolute;left:112px;bottom:74px;font-size:19px;font-weight:800;color:${accent};letter-spacing:.3px;line-height:2.1;">${tags.map(esc).join("<br>")}</div>` : ""}
      </div>
      <div style="width:392px;flex-shrink:0;background:${accent};position:relative;">
        <div style="position:absolute;left:0;right:0;bottom:70px;text-align:center;">
          <div style="width:210px;height:210px;margin:0 auto 18px;background:${hexToRgba("#ffffff", 0.94)};display:flex;align-items:center;justify-content:center;padding:18px;">${logoImg.replace("<img ", '<img style="max-width:100%;max-height:100%;object-fit:contain;" ')}</div>
          <div style="font-size:30px;font-weight:300;letter-spacing:8px;color:#fff;text-transform:lowercase;line-height:1.25;padding:0 18px;">${esc(bizName)}</div>
        </div>
      </div>
    </div>`;
  };

  const renderDetails = (b) => {
    const addr = [client?.address, [client?.city, client?.state].filter(Boolean).join(", "), client?.country].filter(Boolean);
    const meta = [["Quotation No.", tokens.number], ["Date", tokens.date], ["Valid until", fmtDate(quotation?.valid_until)]].filter(([, v]) => v);
    return section(`${heading(b.heading)}
      <div class="keep-together" style="display:flex;gap:30px;justify-content:space-between;font-size:14px;line-height:1.55;">
        <div style="flex:1;"><div style="font-size:12px;font-weight:700;letter-spacing:1.4px;color:${accent};margin-bottom:5px;">PREPARED FOR</div>
          <div style="font-size:19px;font-weight:700;">${esc(clientName || "Client name")}</div>
          ${addr.map((l) => `<div>${esc(l)}</div>`).join("")}
          ${client?.phone ? `<div style="margin-top:4px;">${esc(client.phone)}</div>` : ""}${client?.email ? `<div>${esc(client.email)}</div>` : ""}</div>
        <div style="min-width:280px;">${meta.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:5px 0;border-bottom:1px solid #e6e6e6;"><span style="font-weight:700;">${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}</div>
      </div>`);
  };

  const renderText = (b) => section(`${heading(b.heading)}<div class="rt">${safeRichHtml(fill(b.body)) || ""}</div>`);

  const renderList = (b) => {
    const rows = lines(b.items).map((raw) => {
      const l = fill(raw);
      if (l.startsWith("# ")) return `<h3 class="sub-h" style="margin:16px 0 8px;font-size:16px;font-weight:700;text-decoration:underline;color:#111;">${esc(l.slice(2))}</h3>`;
      let body = esc(l);
      if (b.boldLead) {
        const i = l.indexOf(":");
        if (i > 0 && i < 60) body = `<strong>${esc(l.slice(0, i + 1))}</strong>${esc(l.slice(i + 1))}`;
      }
      const mark = b.style === "number" ? "" : b.style === "bullet" ? `<span style="color:${accent};font-size:20px;line-height:1;">&bull;</span>` : checkIcon(accent);
      return { body, mark };
    });
    let n = 0;
    const html = rows.map((r) => {
      if (typeof r === "string") { n = 0; return r; }
      n += 1;
      const mark = b.style === "number" ? `<span style="font-weight:600;color:${accent};">${n}.</span>` : r.mark;
      return `<div class="keep-together" style="display:flex;gap:11px;align-items:flex-start;margin:0 0 8px;font-size:14.5px;line-height:1.55;"><div style="width:20px;flex-shrink:0;padding-top:${b.style === "number" ? 0 : 3}px;text-align:center;">${mark}</div><div style="flex:1;min-width:0;">${r.body}</div></div>`;
    }).join("");
    return section(`${heading(b.heading)}${html}`);
  };

  const renderStats = (b) => {
    const rows = (b.rows || []).filter((r) => String(r?.label || "").trim()).map((r) => `<div class="keep-together" style="margin:0 0 9px;font-size:18px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:.2px;">${esc(fill(r.label))} = ${esc(fill(r.value) || "—")}${r.note ? ` <span style="font-weight:400;font-size:14.5px;text-transform:none;">${esc(fill(r.note))}</span>` : ""}</div>`).join("");
    return section(`${heading(b.heading)}${rows}`);
  };

  const renderImages = (b) => {
    const g = galleryHtml(b.images, { margin: "0" });
    return g ? section(`${heading(b.heading)}${g}`) : "";
  };

  const renderTable = (b) => {
    const cols = (b.columns || []).map((c) => fill(c));
    if (!cols.length) return "";
    const head = `<tr>${cols.map((c, i) => `<th style="text-align:left;padding:10px 12px;font-size:15px;font-weight:700;color:${accent};border-top:1.5px solid ${accent};border-bottom:1.5px solid ${accent};${i === 0 ? "width:14%;" : ""}">${esc(c)}</th>`).join("")}</tr>`;
    const body = (b.rows || []).map((r, ri) => `<tr style="background:${ri % 2 === 0 ? tint : "#fff"};">${cols.map((_, ci) => `<td style="padding:10px 12px;font-size:14px;line-height:1.45;vertical-align:top;${ci === 0 ? "font-weight:700;" : ""}color:${ci === 0 ? accent : "#222"};">${br(fill((r || [])[ci] || ""))}</td>`).join("")}</tr>`).join("");
    return section(`${heading(b.heading)}<table style="width:100%;border-collapse:collapse;"><thead>${head}</thead><tbody>${body}</tbody></table>`);
  };

  const renderCallout = (b) => {
    const t = fill(b.text).trim();
    if (!t) return "";
    return b.style === "box"
      ? section(`<div class="keep-together" style="background:${tint};border-left:5px solid ${accent};padding:16px 20px;font-size:15px;line-height:1.55;">${br(t)}</div>`)
      : section(`<div class="keep-together" style="text-align:center;font-size:19px;line-height:1.5;font-style:italic;color:${accent};padding:6px 30px;">&ldquo;${br(t)}&rdquo;</div>`);
  };

  const renderPricing = (b) => {
    const { main, includes } = splitIncludes(items);
    const durationText = (it) => (it.rate_type === "Per Day" ? `${it.days || 1} Day(s)` : it.rate_type === "Per Unit" ? `${it.quantity || 1} Unit(s)` : it.rate_type === "Per Event" ? "Per Event" : "—");
    const th = (t, w = "", al = "left") => `<th style="text-align:${al};padding:10px 12px;font-size:13px;font-weight:700;letter-spacing:.6px;color:#fff;background:${accent};${w ? `width:${w};` : ""}">${t}</th>`;
    const rowsHtml = main.map((it, i) => `<tr style="background:${i % 2 ? tint : "#fff"};">
      <td style="padding:10px 12px;font-size:13.5px;vertical-align:top;text-align:center;">${String(i + 1).padStart(2, "0")}</td>
      <td style="padding:10px 12px;font-size:14px;font-weight:700;vertical-align:top;">${esc(it.name || "")}${addonPill(it)}${it.description ? `<div style="font-weight:400;font-size:12.5px;color:#555;margin-top:3px;white-space:pre-line;">${esc(it.description)}</div>` : ""}</td>
      <td style="padding:10px 12px;font-size:13px;vertical-align:top;text-align:center;">${esc(durationText(it))}</td>
      ${showPrices ? `<td style="padding:10px 12px;font-size:13.5px;font-weight:600;vertical-align:top;text-align:right;white-space:nowrap;">${moneySym(it.line_total, symbol)}${rateNoteHtml(it, symbol)}</td>` : ""}
    </tr>`).join("");
    const table = b.showItems !== false && main.length
      ? `<table style="width:100%;border-collapse:collapse;border:1px solid #e1e1e1;"><thead><tr>${th("#", "50px", "center")}${th("DESCRIPTION")}${th("DURATION", "130px", "center")}${showPrices ? th(`AMOUNT (${esc(currency || "INR")})`, "190px", "right") : ""}</tr></thead><tbody>${rowsHtml}</tbody></table>`
      : "";
    const inc = b.showItems !== false ? includesPdfHtml(includes, { symbol, showPrices, accent }) : "";
    let totals = "";
    if (b.showTotals !== false && showPrices) {
      const row = (l, v, extra = "") => `<div class="keep-together" style="display:flex;justify-content:space-between;gap:20px;padding:9px 14px;border-bottom:1px solid #e1e1e1;font-size:14px;${extra}"><span style="font-weight:700;">${l}</span><span>${v}</span></div>`;
      const discount = Number(quotation?.discount_amount) || 0;
      totals = `<div style="width:420px;margin:16px 0 0 auto;border:1px solid #e1e1e1;">
        ${row("SUBTOTAL", moneySym(quotation?.subtotal || 0, symbol))}
        ${discount > 0 ? row(discountLabelText(quotation), `- ${moneySym(discount, symbol)}`) : ""}
        ${gstLines(quotation, items).map((l) => row(esc(l.label.toUpperCase()), moneySym(l.amount, symbol))).join("")}
        ${row("TOTAL AMOUNT", moneySym(quotation?.grand_total || 0, symbol), `background:${accent};color:#fff;font-size:16px;border-bottom:0;`)}
      </div>`;
    }
    return section(`${heading(b.heading)}${table}${inc}${totals}`);
  };

  const renderMilestones = (b) => {
    if (!shown("payment_schedule")) return "";
    const rows = milestoneRows(quotation);
    if (!rows.length) return "";
    const body = rows.map((m) => {
      const pct = m.type === "percent" ? `${Number(m.value) || 0}%` : "";
      const timing = milestoneTiming(m, fmtDate);
      return `<div class="keep-together" style="display:flex;gap:16px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #e6e6e6;font-size:14.5px;line-height:1.45;">
        <div style="width:64px;flex-shrink:0;font-weight:800;color:${accent};">${esc(pct)}</div>
        <div style="flex:1;min-width:0;"><span style="font-weight:700;">${esc(m.name || "Payment")}</span>${timing ? `<span style="color:#666;"> — ${esc(timing)}</span>` : ""}</div>
        ${showPrices ? `<div style="white-space:nowrap;font-weight:700;">${moneySym(m.calculated_amount, symbol)}</div>` : ""}
      </div>`;
    }).join("");
    return section(`${heading(b.heading)}${body}`);
  };

  const renderTerms = (b) => {
    const src = TERMS_SOURCES[b.source] || TERMS_SOURCES.terms;
    if (!shown(src.key)) return "";
    let html = "";
    if (src.key === "terms") html = safeRichHtml(quotation?.terms_and_conditions || "");
    else if (src.key === "payment_conditions") html = safeRichHtml(quotation?.payment_conditions || "");
    else html = lines(quotation?.special_notes).length ? `<ul>${lines(quotation?.special_notes).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "";
    if (!String(html).trim()) return "";
    return section(`${heading(b.heading ?? src.heading)}<div class="rt">${html}</div>`);
  };

  const renderBank = (b) => {
    if (!shown("bank")) return "";
    const bd = parseJsonField(quotation?.bank_details_snapshot);
    const rows = [["Account name", bd.account_name], ["Bank", bd.bank_name], ["Account no.", bd.account_number], ["IFSC", bd.ifsc], ["UPI ID", bd.upi_id]].filter(([, v]) => v);
    if (!rows.length) return "";
    return section(`${heading(b.heading)}<div class="keep-together">${rows.map(([k, v]) => `<div style="display:flex;gap:16px;padding:6px 0;border-bottom:1px dotted #ddd;font-size:14px;"><span style="width:170px;flex-shrink:0;font-weight:700;color:#444;">${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}</div>`);
  };

  const renderSocial = (b) => {
    if (!shown("social")) return "";
    const items2 = socialItemsFrom(parseJsonField(quotation?.social_links_snapshot));
    if (!items2.length) return "";
    return section(`${heading(b.heading)}<div class="keep-together social-icons" style="display:flex;gap:10px;">${socialIconsHtml(items2, "social-circle")}</div>`);
  };

  const renderSignoff = (b) => section(`<div class="keep-together" style="font-size:14.5px;line-height:1.6;">
      ${b.text ? `<p style="margin:0 0 22px;">${br(fill(b.text))}</p>` : ""}
      ${b.regards ? `<div>${esc(fill(b.regards))}</div>` : ""}
      <div style="margin-top:26px;font-weight:800;font-size:16px;">${esc(fill(b.name) || bizName)}</div>
      ${b.role ? `<div style="color:#444;">${esc(fill(b.role))}</div>` : ""}
    </div>`, { gap: 34 });

  const RENDER = { cover: renderCover, details: renderDetails, text: renderText, list: renderList, stats: renderStats, images: renderImages, table: renderTable, callout: renderCallout, pricing: renderPricing, milestones: renderMilestones, terms: renderTerms, bank: renderBank, social: renderSocial, signoff: renderSignoff };

  let hasCover = false;
  const bodyHtml = blocks.map((b, i) => {
    if (b.type === "pagebreak") return i === 0 ? "" : `<div class="pdf-force-break" style="height:0;"></div>`;
    if (b.type === "cover") {
      if (hasCover || i !== 0) return ""; // only a first block can be the cover
      hasCover = true;
    }
    const out = (RENDER[b.type] || (() => ""))(b);
    // The first block after the cover / a page break sits right under the header, so it needs less air above it.
    return out;
  }).join("");

  const fontLink = font.link ? `<link data-pdf-font data-families="${esc(font.families || "")}" rel="stylesheet" href="${esc(font.link)}" />` : "";
  const preface = !hasCover && !letterhead.enabled ? `<div style="height:44px;"></div>` : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Quotation ${esc(tokens.number)}</title>
${fontLink}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${font.css}; color: #1c1c1c; background: #fff; }
  .quotation { width: ${PAGE_W}px; margin: 0 auto; background: #fff; padding-bottom: 20px; }
  .rt { font-size: 14.5px; line-height: 1.6; text-align: justify; }
  .rt p { margin: 0 0 10px; }
  .rt ul, .rt ol { padding-left: 24px; margin: 0 0 10px; }
  .rt li { margin-bottom: 4px; }
  .social-circle { width: 28px; height: 28px; background: ${accent}; color: #fff; border-radius: 50%; display: grid; place-items: center; }
  ${quillContentCss}
</style></head>
<body>
  ${headerHtml ? `<div id="pdf-page-header">${headerHtml}</div>` : ""}
  ${footerHtml ? `<div id="pdf-page-footer">${footerHtml}</div>` : ""}
  <div class="quotation" id="quotation">${preface}${bodyHtml}</div>
</body></html>`;
}
