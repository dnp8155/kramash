import { useMemo } from "react";
import { cn } from "@/lib/utils";

// A donut of thick, round-ended segments. Hover (or tap / focus) a segment and it swells and takes its colour while the
// others rest in grey; the middle shows that segment's name and amount. Pure SVG, so it follows the theme.
const SIZE = 240;
const C = SIZE / 2;
const R = 88;
const REST = 14;   // stroke width at rest
const ACTIVE = 32; // stroke width when picked
const ALL = 24;    // stroke width when every segment is shown in colour (active = -1)
const GAP = 0.05;  // radians of air between neighbours

const pt = (a) => [C + R * Math.sin(a), C - R * Math.cos(a)];

export default function RoundedDonut({ slices, colors, total, formatValue, centerCaption = "spent", allLabel = "All categories", active, onActive, className }) {
  const arcs = useMemo(() => {
    // Proportional, but never thinner than a visible bead, so a tiny category stays easy to see and tap.
    const raw = slices.map((x) => Math.max(Number(x.amount) || 0, 0));
    const rawSum = raw.reduce((a, v) => a + v, 0) || 1;
    const weights = raw.map((v) => Math.max(v / rawSum, 0.07));
    const sum = weights.reduce((a, v) => a + v, 0);
    // Round caps stick out by half the stroke; keep neighbours clear of the swollen one.
    const pad = (ACTIVE / 2) / R * 0.55 + GAP;
    let at = 0;
    return slices.map((x, i) => {
      const span = (weights[i] / sum) * Math.PI * 2;
      const mid = at + span / 2;
      const len = Math.max(span - pad * 2, 0.02);
      const a0 = mid - len / 2, a1 = mid + len / 2;
      at += span;
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      return { i, d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${len > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}` };
    });
  }, [slices]);

  const all = active < 0;
  const current = all ? null : (slices[active] || slices[0]);
  const color = current ? colors[(slices[active] ? active : 0) % colors.length] : undefined;

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[260px]", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full overflow-visible" role="img" aria-label={current ? `${current.name}: ${formatValue(current.amount)}` : `All: ${formatValue(total)}`}>
        {arcs.length === 1 && (
          <circle cx={C} cy={C} r={R} fill="none" tabIndex={0} aria-label={`${slices[0].name}: ${formatValue(slices[0].amount)}`} style={{ stroke: colors[0], strokeWidth: ACTIVE, outline: "none" }} />
        )}
        {arcs.length > 1 && [...arcs].sort((p, q) => (!all && p.i === active) - (!all && q.i === active)).map((a) => {
          const on = all || a.i === active;
          return (
            <path
              key={a.i}
              d={a.d}
              fill="none"
              strokeLinecap="round"
              tabIndex={0}
              role="button"
              aria-label={`${slices[a.i].name}: ${formatValue(slices[a.i].amount)}`}
              onMouseEnter={() => onActive(a.i)}
              onFocus={() => onActive(a.i)}
              onClick={() => onActive(a.i)}
              style={{
                stroke: on ? colors[a.i % colors.length] : "hsl(var(--muted))",
                strokeWidth: all ? ALL : on ? ACTIVE : REST,
                transition: "stroke-width .28s cubic-bezier(.34,1.56,.64,1), stroke .2s ease",
                cursor: "pointer",
                outline: "none",
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-10 text-center">
        <span className="text-xs text-muted-foreground truncate max-w-full">{current ? current.name : allLabel}</span>
        <span className="text-lg font-bold tabular-nums leading-tight break-words" style={{ color }}>{formatValue(current ? current.amount : total)}</span>
        <span className="text-[11px] text-muted-foreground">{current ? `${current.share.toFixed(0)}% · ${centerCaption}` : `100% · ${centerCaption}`}</span>
      </div>
    </div>
  );
}
