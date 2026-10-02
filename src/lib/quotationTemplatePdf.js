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
const MARGIN_MM = 10;           // top/bottom margin on continuation pages, bottom margin on page 1
const MIN_FILL = 0.55;          // don't end a page earlier than this fraction of its height
// Descenders (g, y, p) can hang a couple of pixels below a line's box, so a cut placed exactly
// at the next block's top would leave a sliver of the previous line on the next page.
const CUT_NUDGE_CSS_PX = 3;
// How far html2canvas draws text below where the browser lays it out, in the bundled templates
// (measured across all four with Arial/Helvetica, the only fonts they use).
const CAPTURE_TEXT_DROP_PX = 3;

// Things that must not be cut through. A page break is allowed anywhere else.
const ATOMIC = "tr, li, .day-block, .total-card, .total-box, .pricing-box, .payment-schedule, .bank-details, .payment-method, .footer-top, .footer, .signed-block, .detail-line, .bullet-line, .client-project, .top-section, img, h1, h2, h3, .section-title, .quote-heading";

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

// Vertical spans (in canvas pixels) where a page break would cut through content.
function forbiddenSpans(target, scale) {
  const base = target.getBoundingClientRect().top;
  const spans = [];
  target.querySelectorAll(ATOMIC).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 2) return;
    let top = (r.top - base) * scale;
    let bottom = (r.bottom - base) * scale;
    // Keep a heading together with what follows it.
    if (el.matches("h1, h2, h3, .section-title, .quote-heading")) bottom += 40 * scale;
    spans.push([top, bottom]);
  });
  return spans;
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

export async function generateTemplatePdf(html, { filename = "quotation.pdf", returnBlob = false } = {}) {
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
    fix.textContent = "img[data-contact-icon]{position:relative;top:" + CAPTURE_TEXT_DROP_PX + "px;}";
    doc.head.appendChild(fix);

    await waitForImages(doc);
    try { await doc.fonts?.ready; } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 300));

    const target = doc.querySelector(".quotation-page") || doc.querySelector(".invoice-page") || doc.querySelector(".quotation") || doc.body;
    target.style.background = "#ffffff";

    const captureWidth = target.offsetWidth || 1120;
    const SCALE = 2;

    const spans = forbiddenSpans(target, SCALE);

    const restoreHost = neutraliseHostLineHeight();
    let canvas;
    try {
      canvas = await html2canvas(target, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: captureWidth,
        windowWidth: captureWidth + 100,
      });
    } finally {
      restoreHost();
    }

    // Canvas pixels that fit on one A4 page at full width.
    const pxPerMm = canvas.width / PAGE_W_MM;
    const firstH = Math.floor((PAGE_H_MM - MARGIN_MM) * pxPerMm);
    const nextH = Math.floor((PAGE_H_MM - 2 * MARGIN_MM) * pxPerMm);
    const breaks = planBreaks(canvas.height, firstH, nextH, spans, CUT_NUDGE_CSS_PX * SCALE);

    const pdf = new jsPDF("p", "mm", "a4");
    const edges = [0, ...breaks, canvas.height];
    for (let i = 0; i < edges.length - 1; i++) {
      const sy = Math.round(edges[i]);
      const sh = Math.max(1, Math.round(edges[i + 1]) - sy);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sh;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

      if (i > 0) pdf.addPage();
      const topMm = i === 0 ? 0 : MARGIN_MM;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, topMm, PAGE_W_MM, sh / pxPerMm);
    }

    if (returnBlob) {
      return { url: pdf.output("bloburl"), filename };
    }
    pdf.save(filename);
    return true;
  } finally {
    document.body.removeChild(iframe);
  }
}
