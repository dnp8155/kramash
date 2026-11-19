import { pickDominantColor, pickLogoTone } from "@/lib/profileWallpaper";

// Reads the logo in the visitor's browser: its most vivid colour ({ h, s }, or null for black / white / grey logos)
// and, for logos without colour, whether it is "dark" or "light". Any failure (a host that does not allow reading
// the image, a broken image, no canvas) returns { color: null, tone: null } and the header uses its category tint.
export function analyzeLogoFromUrl(url) {
  const none = { color: null, tone: null };
  return new Promise((resolve) => {
    if (!url || typeof document === "undefined") { resolve(none); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (v) => resolve(v);
    img.onload = () => {
      try {
        const S = 48;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = S;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, S, S);
        const data = ctx.getImageData(0, 0, S, S).data;
        const color = pickDominantColor(data);
        done({ color, tone: color ? null : pickLogoTone(data, S) });
      } catch { done(none); }
    };
    img.onerror = () => done(none);
    img.src = url;
    setTimeout(() => done(none), 6000);
  });
}
