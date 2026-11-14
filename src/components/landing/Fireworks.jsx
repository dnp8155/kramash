import { useEffect, useRef } from "react";

// Diwali fireworks behind the pricing banner, drawn on one <canvas>. Rockets rise from the bottom, burst at a random
// spot, and every burst is a different style (peony, chrysanthemum, ring, willow, palm, crackle, double). Each burst
// uses a random festive colour pair. Drawing on a canvas (not animated SVG) keeps scrolling smooth on phones, and the
// loop pauses whenever the section is off screen or the tab is hidden. Nothing is drawn for "reduce motion".

const PALETTES = [
  ["#FFB000", "#FF7A00"], // gold + saffron
  ["#E5322D", "#FF9A7A"], // red + coral
  ["#D4145A", "#FF8FB8"], // magenta + pink
  ["#1E9E5B", "#9FF0C0"], // green + mint
  ["#7B2FBE", "#D9B8FF"], // purple + lilac
  ["#F57C00", "#FFE08A"], // orange + yellow
  ["#C62828", "#FFC107"], // crimson + gold
];
const STYLES = ["peony", "chrysanthemum", "ring", "willow", "palm", "crackle", "double"];
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// One spark. `k` is air drag per second, `g` gravity in px/s², `ttl` how long it lives (seconds), `trail` how many
// past positions are drawn behind it.
function spark(x, y, angle, speed, o) {
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, k: o.k ?? 1.6, g: o.g ?? 40, t: 0, ttl: o.ttl ?? 1.6, size: (o.size ?? 2) * 1.3, color: o.color, trail: o.trail ?? 3, twinkle: !!o.twinkle, pts: [] };
}

// Returns the sparks for one burst. R is the burst radius in px. "double" returns a big burst plus a delayed small one.
function makeBurst(style, x, y, R, [c1, c2]) {
  const out = [];
  const v = (r, k) => (r * k) / (1 - Math.exp(-k * 1)); // launch speed that reaches about radius r in ~1s
  if (style === "peony") {
    for (let i = 0; i < 78; i++) out.push(spark(x, y, rand(0, TAU), v(R * Math.sqrt(rand(0.15, 1)), 1.7), { color: i % 4 ? c1 : c2, ttl: rand(1.4, 1.9), size: 2.3, trail: 3, g: 45 }));
  } else if (style === "chrysanthemum") {
    for (let i = 0; i < 96; i++) out.push(spark(x, y, (i / 96) * TAU + rand(-0.05, 0.05), v(R * rand(0.55, 1), 1.5), { color: i % 2 ? c1 : c2, ttl: rand(1.9, 2.4), size: 1.7, trail: 9, g: 38 }));
  } else if (style === "ring") {
    for (let i = 0; i < 46; i++) out.push(spark(x, y, (i / 46) * TAU, v(R, 2.2), { color: c1, ttl: 1.5, size: 2.6, trail: 4, g: 22, k: 2.2 }));
    for (let i = 0; i < 24; i++) out.push(spark(x, y, (i / 24) * TAU + 0.13, v(R * 0.55, 2.2), { color: c2, ttl: 1.4, size: 2.1, trail: 3, g: 22, k: 2.2 }));
  } else if (style === "willow") {
    for (let i = 0; i < 64; i++) out.push(spark(x, y, rand(0, TAU), v(R * rand(0.45, 0.95), 1.2), { color: i % 5 ? "#F5A300" : "#FFE08A", ttl: rand(2.6, 3.3), size: 1.5, trail: 14, g: 70, k: 1.2 }));
  } else if (style === "palm") {
    const arms = 7;
    for (let a = 0; a < arms; a++) {
      const base = (a / arms) * TAU + rand(-0.1, 0.1);
      for (let j = 0; j < 13; j++) out.push(spark(x, y, base + rand(-0.04, 0.04), v(R * (0.35 + 0.65 * (j / 12)), 1.4), { color: j % 3 ? c1 : c2, ttl: rand(1.9, 2.3), size: 2.6, trail: 6, g: 62, k: 1.4 }));
    }
  } else if (style === "crackle") {
    for (let i = 0; i < 90; i++) out.push(spark(x, y, rand(0, TAU), v(R * Math.sqrt(rand(0.2, 1)), 1.6), { color: i % 3 ? "#FFF3C4" : c1, ttl: rand(1.8, 2.5), size: 1.9, trail: 2, g: 30, twinkle: true }));
  } else {
    for (let i = 0; i < 60; i++) out.push(spark(x, y, rand(0, TAU), v(R * Math.sqrt(rand(0.2, 1)), 1.7), { color: i % 3 ? c1 : c2, ttl: rand(1.4, 1.8), size: 2.3, trail: 3, g: 45 }));
  }
  return out;
}

export default function Fireworks({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const rockets = [];
    let sparks = [];
    const later = []; // bursts waiting for their moment (the second part of a "double")
    let bag = [];
    let lastStyle = "";
    let lastPalette = null;
    let spawnIn = 0.05; // the first rocket leaves right away
    let running = false;
    let raf = 0;
    let prev = 0;

    const nextStyle = () => {
      if (bag.length === 0) { bag = shuffle(STYLES); if (bag[bag.length - 1] === lastStyle) bag.reverse(); }
      lastStyle = bag.pop();
      return lastStyle;
    };
    const nextPalette = () => {
      let p = pick(PALETTES);
      if (p === lastPalette) p = pick(PALETTES);
      lastPalette = p;
      return p;
    };

    const launch = () => {
      const R = Math.max(62, Math.min(W * 0.17, 115)) * rand(0.85, 1.1);
      // Keep the whole burst inside the picture: never closer to an edge than its radius.
      const margin = R * 1.15 + 8;
      const x = rand(margin, Math.max(margin + 1, W - margin));
      const y = rand(R * 1.2 + 14, Math.max(R * 1.2 + 15, H * 0.62));
      rockets.push({ sx: x + rand(-26, 26), x, y, t: 0, dur: rand(0.7, 1.0), style: nextStyle(), R, palette: nextPalette(), pts: [] });
    };

    const burst = (r) => {
      sparks.push(...makeBurst(r.style, r.x, r.y, r.R, r.palette));
      if (r.style === "double") later.push({ at: 0.3, x: r.x, y: r.y, R: r.R * 0.55, style: "ring", palette: [r.palette[1], r.palette[0]] });
    };

    const step = (now) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - prev) / 1000 || 0.016);
      prev = now;

      spawnIn -= dt;
      if (spawnIn <= 0 && rockets.length < 3 && sparks.length < 520) { launch(); spawnIn = rand(0.75, 1.5); }

      for (let i = later.length - 1; i >= 0; i--) {
        later[i].at -= dt;
        if (later[i].at <= 0) { const l = later.splice(i, 1)[0]; sparks.push(...makeBurst(l.style, l.x, l.y, l.R, l.palette)); }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";

      // Rockets: a quick, slowing climb with a golden streak behind.
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t += dt;
        const p = Math.min(1, r.t / r.dur);
        const e = 1 - Math.pow(1 - p, 3);
        const x = r.sx + (r.x - r.sx) * e;
        const y = H + 12 + (r.y - (H + 12)) * e;
        r.pts.push([x, y]);
        if (r.pts.length > 12) r.pts.shift();
        for (let j = 1; j < r.pts.length; j++) {
          ctx.globalAlpha = (j / r.pts.length) * 0.85;
          ctx.strokeStyle = "#F5A300";
          ctx.lineWidth = 1 + 1.6 * (j / r.pts.length);
          ctx.beginPath(); ctx.moveTo(r.pts[j - 1][0], r.pts[j - 1][1]); ctx.lineTo(r.pts[j][0], r.pts[j][1]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFE08A";
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
        if (p >= 1) { rockets.splice(i, 1); burst(r); }
      }

      // Sparks.
      const alive = [];
      for (const s of sparks) {
        s.t += dt;
        if (s.t >= s.ttl) continue;
        const drag = Math.exp(-s.k * dt);
        s.vx *= drag; s.vy = s.vy * drag + s.g * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.pts.push([s.x, s.y]);
        if (s.pts.length > s.trail) s.pts.shift();
        const life = 1 - s.t / s.ttl;
        let a = life < 0.4 ? life / 0.4 : 1;
        if (s.twinkle && Math.random() < 0.35) a *= 0.2;
        ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
        for (let j = 1; j < s.pts.length; j++) {
          ctx.globalAlpha = a * (j / s.pts.length) * 0.85;
          ctx.lineWidth = s.size * (0.35 + 0.65 * (j / s.pts.length));
          ctx.beginPath(); ctx.moveTo(s.pts[j - 1][0], s.pts[j - 1][1]); ctx.lineTo(s.pts[j][0], s.pts[j][1]); ctx.stroke();
        }
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.55 + 0.45 * life), 0, TAU); ctx.fill();
        alive.push(s);
      }
      sparks = alive;
      ctx.globalAlpha = 1;
    };

    const start = () => { if (running) return; running = true; prev = performance.now(); raf = requestAnimationFrame(step); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    let onScreen = true;
    const sync = () => { if (onScreen && !document.hidden) start(); else stop(); };
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { rootMargin: "80px 0px" })
      : null;
    io?.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-x-0 top-0 w-full h-[420px] sm:h-[480px] ${className}`} aria-hidden="true" />;
}
