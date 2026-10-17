import { useEffect, useMemo, useRef, useState } from "react";
import { doodlesFor } from "@/constants/profileWallpaper";
import { buildWallpaperLayout, hashString } from "@/lib/profileWallpaper";

// WhatsApp-style doodle wallpaper for the public profile header: small outline icons of the business's own
// category, each turned a different way. Rows drift slowly sideways (random direction and pace per row), and now
// and then one doodle lights up softly and fades. Fills its parent (which must be position: relative).
const CSS = `
.pw-wall { position:absolute; inset:0; overflow:hidden; pointer-events:none;
  -webkit-mask-image: radial-gradient(ellipse 46% 52% at 50% 50%, rgba(0,0,0,.18) 0%, rgba(0,0,0,.55) 60%, #000 100%);
          mask-image: radial-gradient(ellipse 46% 52% at 50% 50%, rgba(0,0,0,.18) 0%, rgba(0,0,0,.55) 60%, #000 100%); }
.pw-wall svg.pw-root { display:block; width:100%; height:100%; }
.pw-d { stroke-opacity:var(--pw-op); }
.pw-row { animation-timing-function:linear; animation-iteration-count:infinite; }
.pw-row.l { animation-name:pw-drift-l; }
.pw-row.r { animation-name:pw-drift-r; }
@keyframes pw-drift-l { from { transform:translateX(0); } to { transform:translateX(calc(-1 * var(--pw-p))); } }
@keyframes pw-drift-r { from { transform:translateX(calc(-1 * var(--pw-p))); } to { transform:translateX(0); } }
.pw-d.pw-glow { animation:pw-glow 6s ease-in-out both; }
@keyframes pw-glow {
  0%,100% { stroke-opacity:var(--pw-op); filter:none; }
  50% { stroke-opacity:var(--pw-glow-op); stroke:var(--pw-glow); filter:drop-shadow(0 0 5px var(--pw-glow-soft)); }
}
@media (prefers-reduced-motion: reduce) { .pw-row, .pw-d.pw-glow { animation:none !important; } }
`;

export default function ProfileWallpaper({ category, glow = "#f1d98d", glowSoft = "rgba(241,217,141,.55)", stroke = "#fff", opacity = 0.13, glowOpacity = 0.6, motion = "random" }) {
  const wallRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const icons = useMemo(() => doodlesFor(category), [category]);
  // One random seed per visit, so "random" is different each time but stable while the page is open.
  const motionSeed = useRef(Math.floor(Math.random() * 1e9)).current;

  useEffect(() => {
    const el = wallRef.current?.parentElement;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    let t;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 150); }) : null;
    ro?.observe(el);
    return () => { clearTimeout(t); ro?.disconnect(); };
  }, []);

  const layout = useMemo(
    () => buildWallpaperLayout({ width: size.w, height: size.h, iconCount: icons.length, seed: hashString(category || "OTHER"), motion, motionSeed }),
    [size.w, size.h, icons.length, category, motion, motionSeed]
  );

  // Every 1.4–3.4 s one doodle (never one behind the name, never the same twice in a row) glows for 6 s.
  useEffect(() => {
    if (!layout.rows.length) return undefined;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let timer; let last = null; let stopped = false;
    const tick = () => {
      if (stopped) return;
      const wall = wallRef.current;
      const all = wall ? wall.querySelectorAll(".pw-d") : [];
      if (all.length) {
        const el = all[Math.floor(Math.random() * all.length)];
        const hb = wall.getBoundingClientRect();
        const eb = el.getBoundingClientRect();
        const nx = ((eb.left + eb.width / 2) - hb.left) / hb.width - 0.5;
        const ny = ((eb.top + eb.height / 2) - hb.top) / hb.height - 0.5;
        const behindText = (nx / 0.3) ** 2 + (ny / 0.34) ** 2 < 1;
        if (el !== last && !behindText && nx > -0.5 && nx < 0.5) {
          el.classList.remove("pw-glow"); void el.getBoundingClientRect(); el.classList.add("pw-glow");
          el.addEventListener("animationend", () => el.classList.remove("pw-glow"), { once: true });
          last = el;
        }
      }
      timer = setTimeout(tick, 1400 + Math.random() * 2000);
    };
    timer = setTimeout(tick, 900);
    return () => { stopped = true; clearTimeout(timer); };
  }, [layout]);

  return (
    <div ref={wallRef} className="pw-wall" aria-hidden="true" style={{ "--pw-glow": glow, "--pw-glow-soft": glowSoft, "--pw-op": opacity, "--pw-glow-op": glowOpacity }}>
      <style>{CSS}</style>
      {layout.rows.length > 0 && (
        <svg className="pw-root" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMinYMin slice"
          fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {layout.rows.map((row, ri) => {
            const cells = row.cells.map((c, ci) => {
              const Icon = icons[c.iconIndex];
              return (
                <g key={ci} className="pw-d" transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.rot} ${(c.size / 2).toFixed(1)} ${(c.size / 2).toFixed(1)})`}>
                  <Icon x={0} y={0} width={c.size.toFixed(1)} height={c.size.toFixed(1)} color="inherit" strokeWidth={1.5} overflow="visible" />
                </g>
              );
            });
            return (
              <g key={ri} className={`pw-row ${row.dir}`} style={{ "--pw-p": `${layout.period}px`, animationDuration: `${Math.round(row.duration)}s` }}>
                <g>{cells}</g>
                <g transform={`translate(${layout.period} 0)`}>{cells}</g>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
