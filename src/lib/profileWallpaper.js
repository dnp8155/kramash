// Pure helpers for the public profile header: the doodle wallpaper layout and the colour taken from the logo.
// No React or browser APIs in here, so it can be unit tested.

export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Staggered grid of doodles for a header of width x height. Every row repeats every `period` px, so a row can slide
// sideways by exactly one period and loop with no jump (the component draws each row twice, one period apart).
// motion: "random" = each row picks its own direction and pace; "ltr" / "rtl" = every row moves the same way.
export function buildWallpaperLayout({ width, height, iconCount, seed = 1, motion = "random", motionSeed = 1 }) {
  if (!width || !height || !iconCount) return { period: 0, rows: [] };
  const cell = width < 520 ? 62 : 72;
  const cols = Math.ceil(width / cell) + 1;
  const rowCount = Math.ceil(height / cell) + 1;
  const period = cols * cell;
  const rand = seededRandom(seed);
  const move = seededRandom(motionSeed);
  const rows = [];
  let idx = -1;
  for (let r = 0; r < rowCount; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      idx++;
      const size = 22 + rand() * 9;
      const x = c * cell + (r % 2 ? cell / 2 : 0) - cell / 2 + (rand() - 0.5) * 14;
      const y = r * cell + (rand() - 0.5) * 14;
      const rot = Math.round((rand() - 0.5) * 70);
      cells.push({ iconIndex: (idx * 7 + Math.floor(rand() * 5)) % iconCount, x, y, size, rot });
    }
    const dir = motion === "random" ? (move() < 0.5 ? "l" : "r") : (motion === "rtl" ? "l" : "r");
    const duration = motion === "random" ? 90 + move() * 90 : 140; // seconds for one full pattern width: slow
    rows.push({ cells, dir, duration });
  }
  return { period, rows };
}

// Most vivid colour in an RGBA pixel array: ignores near-white, near-black and greys, weights by saturation,
// groups by hue. Returns { h, s } (degrees, 0-1) or null when the picture has no real colour (black and white logos).
export function pickDominantColor(data) {
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, hs: 0, ss: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
    if (dl === 0 || l > 0.93 || l < 0.07) continue;
    const s = dl / (1 - Math.abs(2 * l - 1));
    if (s < 0.28) continue;
    let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    h = (h * 60 + 360) % 360;
    const w = s * (1 - Math.abs(2 * l - 1)) + 0.05;
    const bk = buckets[Math.floor(h / 15) % 24];
    bk.w += w; bk.hs += h * w; bk.ss += s * w;
  }
  let best = null;
  for (const bk of buckets) if (!best || bk.w > best.w) best = bk;
  if (!best || best.w < 0.6) return null;
  return { h: best.hs / best.w, s: best.ss / best.w };
}

// Is a logo without colour dark ("black logo") or light ("white logo")? Looks only at the logo's ink: ignores a
// transparent background, or a plain background colour found along the picture's edge. Returns "dark", "light" or null.
export function pickLogoTone(data, size) {
  if (!data || !size) return null;
  const px = (x, y) => { const o = (y * size + x) * 4; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };
  const border = [];
  for (let k = 0; k < size; k++) { border.push(px(k, 0), px(k, size - 1), px(0, k), px(size - 1, k)); }
  const transparentEdge = border.filter((b) => b[3] < 40).length / border.length >= 0.6;
  let bg = null;
  if (!transparentEdge) {
    const solid = border.filter((b) => b[3] >= 200);
    if (solid.length) bg = [0, 1, 2].map((c) => solid.reduce((sum, b) => sum + b[c], 0) / solid.length);
  }
  let count = 0, lum = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    if (bg) {
      const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
      if (dist < 60) continue;
    }
    count++;
    lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  if (count < (size * size) * 0.01) return null;
  return lum / count < 0.5 ? "dark" : "light";
}

// Everything the public profile header needs, from the logo.
//   colour in the logo  -> deep shade of it as the background, light shade of it for the doodles and glow
//   white / light logo  -> blackish header, white doodles
//   black / dark logo   -> whitish header, dark doodles (and dark text)
//   unknown / no logo   -> the category's own tint, white doodles, gold glow
export function headerColors(color, fallbackTint, tone = null) {
  const dark = {
    light: false, text: "#ffffff", textSoft: "rgba(255,255,255,.95)",
    shadowTitle: "0 2px 4px rgba(0,0,0,.45), 0 4px 22px rgba(0,0,0,.55)", shadowText: "0 1px 3px rgba(0,0,0,.5), 0 2px 14px rgba(0,0,0,.5)",
    scrim: "radial-gradient(ellipse 62% 72% at 50% 52%, rgba(0,0,0,.55), rgba(0,0,0,0) 78%), linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.34))",
    plate: "#fbf9f4", plateInk: "#1a1a1a", ring: "rgba(255,255,255,.35)", plateShadow: "0 12px 34px rgba(0,0,0,.4)",
    chipBg: "rgba(0,0,0,.35)", chipBorder: "rgba(255,255,255,.3)",
    doodle: "#ffffff", doodleOpacity: 0.13, glowOpacity: 0.6,
  };
  if (color) {
    const h = Math.round(color.h);
    const sat = Math.min(Math.max(color.s, 0.35), 0.7);
    return {
      ...dark, bg: `hsl(${h} ${Math.round(sat * 62)}% 15%)`, doodle: `hsl(${h} 70% 84%)`, doodleOpacity: 0.16,
      glow: `hsl(${h} 85% 74%)`, glowSoft: `hsl(${h} 85% 74% / 0.55)`,
    };
  }
  if (tone === "light") { // white logo -> blackish
    return { ...dark, bg: "#101010", glow: "#ffffff", glowSoft: "rgba(255,255,255,.5)", plate: "#1c1c1c", plateInk: "#f5f5f5", ring: "rgba(255,255,255,.25)" };
  }
  if (tone === "dark") { // black logo -> whitish
    return {
      light: true, text: "#141414", textSoft: "rgba(20,20,20,.82)", shadowTitle: "none", shadowText: "none",
      scrim: "radial-gradient(ellipse 62% 72% at 50% 52%, rgba(255,255,255,.65), rgba(255,255,255,0) 78%)",
      plate: "#ffffff", plateInk: "#141414", ring: "rgba(0,0,0,.12)", plateShadow: "0 12px 30px rgba(0,0,0,.14)",
      chipBg: "rgba(255,255,255,.7)", chipBorder: "rgba(0,0,0,.15)",
      bg: "#f3f1ec", doodle: "#111111", doodleOpacity: 0.11, glow: "#000000", glowSoft: "rgba(0,0,0,.35)", glowOpacity: 0.55,
    };
  }
  return { ...dark, bg: fallbackTint, glow: "#f1d98d", glowSoft: "rgba(241, 217, 141, 0.55)" };
}
