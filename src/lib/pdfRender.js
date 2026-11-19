// Crisp PDF page rendering to <canvas>.
// Canvases were drawn at CSS-pixel size and then stretched by the browser, which looks
// blurry on phones (device pixel ratio 2-3). This draws at the device's real resolution
// while keeping the CSS size — and therefore all layout/overlay maths — unchanged.

const MAX_DPR = 3;
// Mobile browsers (iOS especially) refuse canvases beyond ~16M pixels, so cap the area.
const MAX_PIXELS = 12_000_000;

export function pdfOutputScale(cssWidth, cssHeight, maxDpr = MAX_DPR) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const byArea = Math.sqrt(MAX_PIXELS / Math.max(1, cssWidth * cssHeight));
  return Math.max(1, Math.min(dpr, byArea));
}

// Renders `page` into `canvas` so it displays `cssWidth` px wide. Returns the CSS size
// and the page's unscaled size (PDF points).
// Options: maxScale caps the zoom; maxDpr lowers the sharpness cap (long documents);
// fluid lets CSS scale the canvas to its container (width 100%, height auto) so a resize
// or rotation never distorts it; holder.task receives the render task so callers can cancel.
export async function renderPdfPage(page, canvas, cssWidth, { maxScale = Infinity, maxDpr = MAX_DPR, fluid = false, holder } = {}) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(cssWidth / base.width, maxScale);
  const viewport = page.getViewport({ scale });
  const out = pdfOutputScale(viewport.width, viewport.height, maxDpr);

  canvas.width = Math.floor(viewport.width * out);
  canvas.height = Math.floor(viewport.height * out);
  if (fluid) {
    canvas.style.width = "100%";
    canvas.style.height = "auto";
  } else {
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
  }

  const ctx = canvas.getContext("2d");
  const task = page.render({
    canvasContext: ctx,
    viewport,
    transform: out !== 1 ? [out, 0, 0, out, 0, 0] : undefined,
  });
  if (holder) holder.task = task;
  await task.promise;
  page.cleanup?.();

  return { width: viewport.width, height: viewport.height, pdfWidth: base.width, pdfHeight: base.height };
}
