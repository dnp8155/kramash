// ── normalizeToBlack ──────────────────────────────────────────────
// Force every non-transparent pixel to solid black (#000). Prevents
// dark-mode color clashes and ensures signatures/notes are always legible.
// Mutates the canvas in place and returns it.
export function normalizeToBlack(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = 0;       // R
      data[i + 1] = 0;   // G
      data[i + 2] = 0;   // B
      // alpha unchanged
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── trimCanvas ────────────────────────────────────────────────────
// Crop a canvas to the tight bounding box of its non-transparent pixels.
// Returns a new canvas (or the original if entirely empty).
export function trimCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return canvas;
  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;
  const trimmed = document.createElement("canvas");
  trimmed.width = trimW;
  trimmed.height = trimH;
  trimmed.getContext("2d").drawImage(canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);
  return trimmed;
}

// ── overlayToPdfRect ──────────────────────────────────────────────
// Convert on-screen CSS pixel coordinates (top-left origin) into PDF
// points (bottom-left origin) using the rendered canvas dimensions and
// the actual PDF page size.
export function overlayToPdfRect(overlay, renderedSize, pdfSize) {
  const scaleX = pdfSize.width / renderedSize.width;
  const scaleY = pdfSize.height / renderedSize.height;
  return {
    x: overlay.x * scaleX,
    y: pdfSize.height - (overlay.y + overlay.height) * scaleY,
    width: overlay.width * scaleX,
    height: overlay.height * scaleY,
  };
}

// ── processSignatureDataUrl ───────────────────────────────────────
// Take a raw signature dataURL (from SignaturePad or text canvas),
// load it into a temp canvas, normalize to black, trim, and return
// the processed dataURL + natural dimensions.
export async function processSignatureDataUrl(dataUrl) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  normalizeToBlack(canvas);
  const trimmed = trimCanvas(canvas);
  return {
    dataUrl: trimmed.toDataURL("image/png"),
    width: trimmed.width,
    height: trimmed.height,
  };
}

// ── presetToPdfRect ───────────────────────────────────────────────
// Calculate a PDF-point rect from a corner preset + default stamp size.
export function presetToPdfRect(corner, pdfSize, stampW = 180, stampH = 80) {
  const margin = 40;
  switch (corner) {
    case "top-left":     return { x: margin, y: pdfSize.height - stampH - margin, width: stampW, height: stampH };
    case "top-right":    return { x: pdfSize.width - stampW - margin, y: pdfSize.height - stampH - margin, width: stampW, height: stampH };
    case "bottom-left":  return { x: margin, y: margin, width: stampW, height: stampH };
    case "bottom-center": return { x: (pdfSize.width - stampW) / 2, y: margin, width: stampW, height: stampH };
    case "bottom-right":
    default:            return { x: pdfSize.width - stampW - margin, y: margin, width: stampW, height: stampH };
  }
}