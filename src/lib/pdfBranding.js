// "Made with Kramasha" on the last page of PDFs made on the Free plan.
//
// The signed-in app tells this module the workspace's plan (see PdfBrandingSync in AppLayout). Anywhere
// the plan isn't known — e.g. a client downloading from a public link — nothing is added, so a Pro
// business's documents are never branded by mistake.
let branded = false;

export function setPdfBranding(on) { branded = !!on; }
export const shouldBrandPdf = () => branded;

export const MADE_WITH_PREFIX = "Made with ";
export const MADE_WITH_NAME = "Kramasha";

// Centred line near the bottom of a page canvas (same baseline as the "Page n of N" label).
export function stampMadeWithCanvas(page, pxPerMm) {
  if (!branded) return;
  const ctx = page.getContext("2d");
  const size = Math.round(8 * 0.3528 * pxPerMm);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${size}px Helvetica, Arial, sans-serif`;
  const w1 = ctx.measureText(MADE_WITH_PREFIX).width;
  ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
  const w2 = ctx.measureText(MADE_WITH_NAME).width;
  const x = (page.width - (w1 + w2)) / 2;
  const y = page.height - 6 * pxPerMm;
  ctx.fillStyle = "#8A8580";
  ctx.font = `${size}px Helvetica, Arial, sans-serif`;
  ctx.fillText(MADE_WITH_PREFIX, x, y);
  ctx.fillStyle = "#B8963E";
  ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
  ctx.fillText(MADE_WITH_NAME, x + w1, y);
}

// Same line for jsPDF documents; call once, after the last page's content is done.
export function stampMadeWithPdf(doc, y) {
  if (!branded) return;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setPage(doc.internal.getNumberOfPages());
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const w1 = doc.getTextWidth(MADE_WITH_PREFIX);
  doc.setFont("helvetica", "bold");
  const w2 = doc.getTextWidth(MADE_WITH_NAME);
  const x = (pageW - (w1 + w2)) / 2;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(138, 133, 128);
  doc.text(MADE_WITH_PREFIX, x, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(184, 150, 62);
  doc.text(MADE_WITH_NAME, x + w1, y);
}
