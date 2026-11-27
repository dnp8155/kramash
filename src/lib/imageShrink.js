// Browser-side picture shrinking shared by the quotation picture features (web links and on-device pictures).
export const MAX_SIDE = 1600; // pictures are shrunk to this before going into a PDF, to keep it light

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Shrinks to MAX_SIDE and re-encodes as JPEG (white background, so transparent PNGs don't turn black).
export function downscale(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("That file couldn't be read as a picture."));
    img.src = dataUrl;
  });
}

// A picture picked from the person's own device: shrunk and returned as a JPEG Blob.
export async function fileToDownscaledBlob(file) {
  const dataUrl = await downscale(await blobToDataUrl(file));
  return (await fetch(dataUrl)).blob();
}
