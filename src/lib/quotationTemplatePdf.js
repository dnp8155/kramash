// PDF generation from HTML quotation templates using html2canvas + jsPDF.
// Renders the template HTML in a hidden iframe, captures it, and splits it across A4 pages.
//
// The capture is one tall image, but it is NOT cut at fixed heights: a page ends only between
// rows/blocks (table rows, day blocks, totals, list items…), so nothing is sliced through the
// middle of a line, and continuation pages get a top and bottom margin.

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 10;           // top margin on continuation pages that have no running header
const BOTTOM_MM = 14;           // room under the content for the page number
const MIN_FILL = 0.55;          // don't end a page earlier than this fraction of its height
// Descenders (g, y, p) can hang a couple of pixels below a line's box, so a cut placed exactly
// at the next block's top would leave a sliver of the previous line on the next page.
const CUT_NUDGE_CSS_PX = 3;
// How far html2canvas draws text below where the browser lays it out, in the bundled templates
// (measured across all four with Arial/Helvetica, the only fonts they use).
const CAPTURE_TEXT_DROP_PX = 3;

// Things that must not be cut through. A page break is allowed anywhere else.
const ATOMIC = "tr, li, p, .day-block, .total-card, .total-box, .totals-box, .pricing-box, .payment-schedule, .bank-details, .payment-method, .footer-top, .footer, .signed-block, .detail-line, .bullet-line, .client-project, .top-section, .header, .meta-row, .doc-meta, .info-grid, .parties, .payment-text, .amount-words, .date-line, .team-line, .day-heading, .includes-block > div, .social-icons, .item-desc, .keep-together, img, h1, h2, h3, .section-title, .quote-heading, .invoice-heading";

function waitForImages(doc) {
  return new Promise((resolve) => {
    const imgs = doc.querySelectorAll("img");
    let remaining = imgs.length;
    if (remaining === 0) { resolve(); return; }
    const done = () => { remaining--; if (remaining === 0) resolve(); };
    imgs.forEach((img) => {
      if (img.complete) done();
      else { img.onload = done; img.onerror = done; }
    });
    setTimeout(resolve, 5000);
  });
}

// The header/contact icons are SVG images. Some phone browsers draw an SVG <img> onto the capture canvas cropped
// (only a corner of the phone / mail / pin shows). Baking each one to a PNG of fixed size first makes every
// device capture them whole.
async function rasterizeContactIcons(doc) {
  const imgs = [...doc.querySelectorAll("img[data-contact-icon]")];
  await Promise.all(imgs.map(async (img) => {
    try {
      const src = img.getAttribute("src") || "";
      if (!src.startsWith("data:image/svg")) return;
      const size = parseInt(img.getAttribute("width"), 10) || 14;
      const px = size * 6;
      const svgImg = new Image();
      svgImg.width = px;
      svgImg.height = px;
      await new Promise((resolve, reject) => { svgImg.onload = resolve; svgImg.onerror = reject; svgImg.src = src; });
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      canvas.getContext("2d").drawImage(svgImg, 0, 0, px, px);
      const png = canvas.toDataURL("image/png");
      await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; img.src = png; });
    } catch { /* keep the SVG */ }
  }));
}

// Templates that use a web font add <link data-pdf-font data-families="Poppins:400,700"> — wait for the stylesheet
// and request the faces, so the capture doesn't fall back to a default font.
async function waitForFontLinks(doc) {
  const links = [...doc.querySelectorAll("link[data-pdf-font]")];
  if (!links.length) return;
  await Promise.all(links.map((l) => new Promise((resolve) => {
    if (l.sheet) { resolve(); return; }
    l.onload = () => resolve();
    l.onerror = () => resolve();
    setTimeout(resolve, 4000);
  })));
  const faces = [];
  links.forEach((l) => String(l.getAttribute("data-families") || "").split(";").filter(Boolean).forEach((f) => {
    const [family, weights = "400"] = f.split(":");
    weights.split(",").forEach((w) => faces.push(`${w} 16px "${family}"`));
  }));
  try { await Promise.race([Promise.all(faces.map((f) => doc.fonts.load(f))), new Promise((r) => setTimeout(r, 4000))]); } catch { /* ignore */ }
}

// Vertical spans (in canvas pixels) where a page break would cut through content.
function forbiddenSpans(target, scale) {
  const base = target.getBoundingClientRect().top;
  const spans = [];
  target.querySelectorAll(ATOMIC).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 2) return;
    // The faint background watermark floats behind the content; it must not decide where pages break.
    if (el.closest(".watermark")) return;
    let top = (r.top - base) * scale;
    let bottom = (r.bottom - base) * scale;
    // Keep a heading together with what follows it.
    if (el.matches("h1, h2, h3, .section-title, .quote-heading")) bottom += 40 * scale;
    spans.push([top, bottom]);
  });
  return spans;
}

// Bottom edge (canvas px) of the last thing that actually draws something — text, a picture, a rule or a
// filled box. The template's own bottom padding and empty spacers lie below it; counting them as content is
// what produced a final page with nothing on it when the document ended just past a page boundary.
function contentBottom(target, scale) {
  const win = target.ownerDocument.defaultView;
  const base = target.getBoundingClientRect().top;
  let max = 0;
  target.querySelectorAll("*").forEach((el) => {
    if (el.closest(".watermark")) return;
    const r = el.getBoundingClientRect();
    if (r.height < 1 || r.width < 1) return;
    const tag = el.tagName;
    let paints = tag === "IMG" || tag === "SVG" || tag === "HR" || tag === "CANVAS";
    if (!paints) paints = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!paints) {
      const cs = win.getComputedStyle(el);
      const filled = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent" && cs.backgroundColor !== "rgb(255, 255, 255)";
      const ruled = ["Top", "Bottom", "Left", "Right"].some((side) => parseFloat(cs["border" + side + "Width"]) > 0 && cs["border" + side + "Style"] !== "none");
      paints = filled || ruled || cs.backgroundImage !== "none";
    }
    if (paints) max = Math.max(max, (r.bottom - base) * scale);
  });
  return max;
}

// Pick where each page ends. `firstH` / `nextH` = usable content height per page (canvas px).
function planBreaks(totalH, firstH, nextH, spans, nudge) {
  const breaks = [];
  let start = 0;
  let pageH = firstH;
  while (totalH - start > pageH + 1) {
    const limit = start + pageH;
    let cut = limit;
    // Move the cut up until it isn't inside any block (but not so far that the page is nearly empty).
    let guard = 0;
    while (guard++ < 200) {
      const hit = spans.find(([top, bottom]) => cut > top + 1 && cut < bottom - 1);
      if (!hit) break;
      cut = hit[0];
    }
    if (cut < limit) cut = Math.min(limit, cut + nudge);   // step just past the previous line's descenders
    if (cut - start < pageH * MIN_FILL) cut = limit;   // a single huge block: cut where we must
    breaks.push(cut);
    start = cut;
    pageH = nextH;
  }
  return breaks;
}

// html2canvas measures each font's baseline in the HOST page. The app's global line-height (1.5)
// leaks into that measurement, so every line of PDF text is drawn a few pixels too low while
// images, icons and borders stay where the layout put them. Neutralising it for the duration of
// the capture puts text back on its line. (The template itself lives in a separate iframe and is
// not affected.)
function neutraliseHostLineHeight() {
  const style = document.createElement("style");
  style.setAttribute("data-pdf-capture", "");
  style.textContent = "html, body { line-height: normal !important; }";
  document.head.appendChild(style);
  return () => style.remove();
}

// The background watermark is a single absolutely-positioned image, so on a multi-page document it would land on
// one page only. It is taken out of the layout, rendered once, and stamped in the centre of every A4 sheet.
async function renderWatermark(doc, scale) {
  const el = doc.querySelector(".watermark");
  if (!el) return null;
  const src = el.querySelector("img")?.getAttribute("src");
  const size = Math.round(el.getBoundingClientRect().width) || 380;
  const opacity = parseFloat(doc.defaultView.getComputedStyle(el).opacity);
  el.remove();
  if (!src) return null;
  const frame = document.createElement("iframe");
  frame.style.cssText = `position:fixed;left:-9999px;top:0;width:${size}px;height:${size}px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);
  try {
    const d = frame.contentDocument;
    d.open();
    d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}body{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:transparent}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${src.replace(/"/g, "&quot;")}"></body></html>`);
    d.close();
    await waitForImages(d);
    const canvas = await html2canvas(d.body, { scale, useCORS: true, backgroundColor: null, width: size, height: size, windowWidth: size + 100 });
    return { canvas, opacity: Number.isFinite(opacity) ? opacity : 0.05 };
  } catch {
    return null;
  } finally {
    document.body.removeChild(frame);
  }
}

// Lays the template out on A4 pages and returns one full-page canvas per sheet (running header and
// "Page n of N" included). Used by both the PDF download and the paged on-screen preview, so they match.
export async function renderTemplatePages(html) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1200px;height:1600px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();

    // The capture draws text ~3px lower than the browser lays it out (see above), so icons that sit
    // beside text are moved down by the same amount for the capture only. Previews are untouched.
    const fix = doc.createElement("style");
    // Phone browsers enlarge ordinary blocks of text ("text inflation") but not flex rows, which made event names,
    // venues and dates ~1.4x bigger than the team and includes lines in a client's download. Switch it off so
    // the PDF is identical on every device.
    fix.textContent = "html,body{-webkit-text-size-adjust:100%;text-size-adjust:100%;}img[data-contact-icon]{position:relative;top:" + CAPTURE_TEXT_DROP_PX + "px;}";
    doc.head.appendChild(fix);

    await waitForImages(doc);
    await rasterizeContactIcons(doc);
    await waitForFontLinks(doc);
    try { await doc.fonts?.ready; } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 300));

    const target = doc.querySelector(".quotation-page") || doc.querySelector(".invoice-page") || doc.querySelector(".quotation") || doc.body;
    target.style.background = "#ffffff";

    const captureWidth = target.offsetWidth || 1120;
    const SCALE = 2;

    // Templates may still carry a hidden running-header block; the document shows its header on page 1 only.
    doc.getElementById("pdf-running-header")?.remove();

    const watermark = await renderWatermark(doc, SCALE);
    const spans = forbiddenSpans(target, SCALE);
    const usedBottom = contentBottom(target, SCALE);

    // Opt-in layout features (used by the Custom template): a letterhead header and footer repeated on every
    // page, a full-page cover with neither, and forced page breaks. Templates without them take the original path.
    const headerEl = doc.getElementById("pdf-page-header");
    const footerEl = doc.getElementById("pdf-page-footer");
    const coverEl = target.querySelector(".pdf-cover");
    const forcedEls = [...target.querySelectorAll(".pdf-force-break")];
    const paged = !!(headerEl || footerEl || coverEl || forcedEls.length);

    const restoreHost = neutraliseHostLineHeight();
    let canvas;
    let headerCanvas = null;
    let footerCanvas = null;
    try {
      canvas = await html2canvas(target, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: captureWidth,
        windowWidth: captureWidth + 100,
      });
      const grab = (el) => {
        if (!el) return null;
        el.style.width = captureWidth + "px";
        return html2canvas(el, { scale: SCALE, useCORS: true, backgroundColor: "#ffffff", width: captureWidth, windowWidth: captureWidth + 100 });
      };
      [headerCanvas, footerCanvas] = await Promise.all([grab(headerEl), grab(footerEl)]);
    } finally {
      restoreHost();
    }

    // Pages are cut from the content only: a little room under the last line, never the template's empty bottom padding.
    const usedH = usedBottom > 0 ? Math.min(canvas.height, Math.ceil(usedBottom + 24 * SCALE)) : canvas.height;

    if (paged) {
      const base = target.getBoundingClientRect().top;
      const topOf = (el) => (el.getBoundingClientRect().top - base) * SCALE;
      const bottomOf = (el) => (el.getBoundingClientRect().bottom - base) * SCALE;
      const pxPerMmP = canvas.width / PAGE_W_MM;
      const pageHP = Math.round(canvas.width * PAGE_H_MM / PAGE_W_MM);
      const hH = headerCanvas ? headerCanvas.height : 0;
      const fH = footerCanvas ? footerCanvas.height : 0;
      // With a footer, the page number sits just above it; without one it stays at the bottom edge.
      const bottomReserve = Math.round((fH ? 8 : BOTTOM_MM) * pxPerMmP);
      const usable = pageHP - hH - fH - bottomReserve - (hH ? 0 : Math.round(MARGIN_MM * pxPerMmP));

      const coverBottom = coverEl ? Math.min(canvas.height, Math.round(bottomOf(coverEl))) : 0;
      const marks = forcedEls.map(topOf).filter((y) => y > coverBottom + 2 && y < canvas.height - 2).sort((a, b) => a - b);
      const bounds = [coverBottom, ...marks.filter((y) => y < usedH - 2), usedH];
      const contentEdges = []; // [start, end] of each content page, in capture px
      for (let g = 0; g < bounds.length - 1; g++) {
        const a = bounds[g];
        const b = bounds[g + 1];
        if (b - a < 4) continue;
        const gSpans = spans.filter(([t, bt]) => bt > a && t < b).map(([t, bt]) => [t - a, bt - a]);
        const cuts = planBreaks(b - a, usable, usable, gSpans, CUT_NUDGE_CSS_PX * SCALE).map((c) => a + c);
        const edges = [a, ...cuts, b];
        for (let i = 0; i < edges.length - 1; i++) contentEdges.push([edges[i], edges[i + 1]]);
      }

      const newPage = () => {
        const page = document.createElement("canvas");
        page.width = canvas.width;
        page.height = pageHP;
        const ctx = page.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, page.width, page.height);
        return { page, ctx };
      };
      const stamp = (ctx, page) => {
        if (!watermark) return;
        ctx.globalAlpha = watermark.opacity;
        ctx.drawImage(watermark.canvas, Math.round((page.width - watermark.canvas.width) / 2), Math.round((pageHP - watermark.canvas.height) / 2));
        ctx.globalAlpha = 1;
      };

      const out = [];
      if (coverEl && coverBottom > 0) {
        const { page, ctx } = newPage();
        ctx.drawImage(canvas, 0, 0, canvas.width, coverBottom, 0, 0, canvas.width, Math.min(coverBottom, pageHP));
        out.push(page);
      }
      const total = contentEdges.length;
      contentEdges.forEach(([sy, ey], i) => {
        const { page, ctx } = newPage();
        const topPx = hH || Math.round(MARGIN_MM * pxPerMmP);
        ctx.drawImage(canvas, 0, Math.round(sy), canvas.width, Math.max(1, Math.round(ey) - Math.round(sy)), 0, topPx, canvas.width, Math.max(1, Math.round(ey) - Math.round(sy)));
        if (headerCanvas) ctx.drawImage(headerCanvas, 0, 0);
        if (footerCanvas) ctx.drawImage(footerCanvas, 0, pageHP - fH);
        stamp(ctx, page);
        ctx.fillStyle = "#787878";
        ctx.font = `${Math.round(8 * 0.3528 * pxPerMmP)}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = "right";
        const numberY = fH ? pageHP - fH - 2.2 * pxPerMmP : pageHP - 6 * pxPerMmP;
        ctx.fillText(`Page ${i + 1} of ${total}`, page.width - 12 * pxPerMmP, numberY);
        out.push(page);
      });
      if (out.length) return out;
    }

    // Canvas pixels that fit on one A4 page at full width.
    const pxPerMm = canvas.width / PAGE_W_MM;
    const contTopMm = MARGIN_MM;
    const firstH = Math.floor((PAGE_H_MM - BOTTOM_MM) * pxPerMm);
    const nextH = Math.floor((PAGE_H_MM - contTopMm - BOTTOM_MM) * pxPerMm);
    const breaks = planBreaks(usedH, firstH, nextH, spans, CUT_NUDGE_CSS_PX * SCALE);

    const pageH = Math.round(canvas.width * PAGE_H_MM / PAGE_W_MM);
    const edges = [0, ...breaks, usedH];
    const pageCount = edges.length - 1;
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      const sy = Math.round(edges[i]);
      const sh = Math.max(1, Math.round(edges[i + 1]) - sy);
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = pageH;
      const ctx = page.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);
      const topPx = i === 0 ? 0 : Math.round(contTopMm * pxPerMm);
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, topPx, canvas.width, sh);
      // Drawn over the content (the captured slice is opaque white); at a few percent opacity it reads as a background.
      if (watermark) {
        ctx.globalAlpha = watermark.opacity;
        ctx.drawImage(watermark.canvas, Math.round((page.width - watermark.canvas.width) / 2), Math.round((pageH - watermark.canvas.height) / 2));
        ctx.globalAlpha = 1;
      }
      // "Page 2 of 3" on every page.
      ctx.fillStyle = "#787878";
      ctx.font = `${Math.round(8 * 0.3528 * pxPerMm)}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(`Page ${i + 1} of ${pageCount}`, page.width - 12 * pxPerMm, pageH - 6 * pxPerMm);
      pages.push(page);
    }
    return pages;
  } finally {
    document.body.removeChild(iframe);
  }
}


export async function generateTemplatePdf(html, { filename = "quotation.pdf", returnBlob = false } = {}) {
  const pages = await renderTemplatePages(html);
  const pdf = new jsPDF("p", "mm", "a4");
  pages.forEach((page, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(page.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, PAGE_W_MM, PAGE_H_MM);
  });
  if (returnBlob) return { url: pdf.output("bloburl"), filename };
  await deliverPdf(pdf.output("blob"), filename);
  return true;
}

// Hands the finished PDF to the person under its real file name. jsPDF's own save() leaves some phone
// browsers (and in-app browsers) on a bare "blob:https://…" page/name; instead phones get the share sheet
// (Save to Files / WhatsApp…) and everything else a normal named download.
async function deliverPdf(blob, filename) {
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (touch && typeof File !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
        // The tap's permission can lapse while the PDF renders — fall through to a normal download.
      }
    }
  }
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
