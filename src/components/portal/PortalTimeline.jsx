import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Horizontal timeline on desktop, vertical stepper on mobile.
// currentStage: 0 = before booking, 1 = booking confirmed, 2 = planning, 3 = event day, 4 = delivery
// Each stage may carry `when`: a short line under the label (the booking date, the event dates, "Expected 20 Dec").
//
// Every step has its own colour (booked blue, planning violet, event day amber, delivery green). Done and current
// steps are filled in that colour; the line between two done steps blends from one colour to the next.
// Class names are written out in full so Tailwind keeps them.
const TONES = [
  { fill: "bg-primary border-primary", ring: "ring-primary/20", from: "from-primary", to: "to-primary", dash: "border-primary/60" },
  { fill: "bg-violet-500 border-violet-500", ring: "ring-violet-500/20", from: "from-violet-500", to: "to-violet-500", dash: "border-violet-500/60" },
  { fill: "bg-amber-500 border-amber-500", ring: "ring-amber-500/20", from: "from-amber-500", to: "to-amber-500", dash: "border-amber-500/60" },
  { fill: "bg-emerald-500 border-emerald-500", ring: "ring-emerald-500/20", from: "from-emerald-500", to: "to-emerald-500", dash: "border-emerald-500/60" },
];

// The line leading into a step: solid only once that step is done. Into the current (still pending) step it is
// dashed in that step's colour; further ahead it is dashed grey.
function segmentKind(currentStage, nextStep) {
  if (currentStage > nextStep) return "done";
  if (currentStage === nextStep) return "next";
  return "ahead";
}
const toneOf = (i) => TONES[i % TONES.length];

function stateOf(currentStage, step) {
  return { done: currentStage > step, active: currentStage === step, upcoming: currentStage < step };
}

function Dot({ tone, state, step, small }) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold border-2 shrink-0 transition-all",
        small ? "w-8 h-8 text-xs" : "w-10 h-10 text-xs",
        (state.done || state.active) && cn(tone.fill, "text-white"),
        state.active && cn("ring-4", tone.ring),
        state.upcoming && "bg-card border-border text-muted-foreground"
      )}
    >
      {state.done ? <Check className={small ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={3} /> : step}
    </div>
  );
}

export default function PortalTimeline({ currentStage, stages, title = "Project Timeline" }) {
  const n = stages.length || 1;
  return (
    <div className="bg-card border border-border rounded-[15px] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-5">{title}</h3>

      {/* Desktop: horizontal. Every column starts at the top, so the dots sit on one line whatever is written under them. */}
      <div className="hidden sm:flex items-start relative">
        {/* One line piece between each pair of dots, from centre to centre. */}
        {stages.slice(0, -1).map((stage, i) => {
          const kind = segmentKind(currentStage, stages[i + 1].step);
          const pos = { left: `${((i + 0.5) / n) * 100}%`, width: `${100 / n}%` };
          return kind === "done"
            ? <div key={`seg-${stage.step}`} className={cn("absolute top-5 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r", toneOf(i).from, toneOf(i + 1).to)} style={pos} />
            : <div key={`seg-${stage.step}`} className={cn("absolute top-5 h-0 -translate-y-1/2 border-t-2 border-dashed", kind === "next" ? toneOf(i + 1).dash : "border-border")} style={pos} />;
        })}
        {stages.map((stage, i) => {
          const tone = toneOf(i);
          const state = stateOf(currentStage, stage.step);
          return (
            <div key={stage.step} className="flex flex-col items-center relative z-10 flex-1 min-w-0 px-1">
              <Dot tone={tone} state={state} step={stage.step} />
              <span className={cn("text-xs mt-2.5 text-center font-semibold", state.upcoming ? "text-muted-foreground" : "text-foreground")}>
                {stage.label}
              </span>
              {stage.when && (
                <span className="mt-1 text-[11px] text-center leading-snug text-muted-foreground max-w-full">
                  {stage.when}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden">
        {stages.map((stage, i) => {
          const tone = toneOf(i);
          const state = stateOf(currentStage, stage.step);
          const isLast = i === stages.length - 1;
          return (
            <div key={stage.step} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <Dot tone={tone} state={state} step={stage.step} small />
                {!isLast && (() => {
                  const kind = segmentKind(currentStage, stages[i + 1].step);
                  return kind === "done"
                    ? <div className={cn("w-0.5 flex-1 min-h-[1.25rem] my-1 rounded-full bg-gradient-to-b", tone.from, toneOf(i + 1).to)} />
                    : <div className={cn("w-0 flex-1 min-h-[1.25rem] my-1 border-l-2 border-dashed", kind === "next" ? toneOf(i + 1).dash : "border-border")} />;
                })()}
              </div>
              <div className={cn("min-w-0 pt-1.5", !isLast && "pb-4")}>
                <div className={cn("text-sm font-semibold leading-5", state.upcoming ? "text-muted-foreground" : "text-foreground")}>{stage.label}</div>
                {stage.when && (
                  <span className="block mt-0.5 text-xs text-muted-foreground">
                    {stage.when}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
