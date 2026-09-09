import { Check } from "lucide-react";

const CATEGORIES = [
  { name: "Photography", sub: "Events · Crew · Services" },
  { name: "Event Management", sub: "Events · Team · Availability" },
  { name: "Architecture", sub: "Projects · Sites · Project Team" },
  { name: "Other Services", sub: "Projects · Custom Roles · Services" },
];

const STEPS = [
  "Create account",
  "Choose your business",
  "Set up workspace",
  "Start managing",
];

const PRODUCT_MODULES = [
  "Projects / Events",
  "Team",
  "Quotations",
  "Financials",
];

const TRUST_POINTS = [
  "Multi-industry workspace",
  "Optional GST quotations",
  "Team & financial management",
];

export default function SignupProductPanel() {
  return (
    <div className="flex h-full min-h-dvh flex-col justify-center bg-foreground px-8 py-12 xl:px-14">
      <div className="mx-auto w-full max-w-md">
        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-wider text-background/50">
          Your workspace starts here
        </p>

        {/* Headline */}
        <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-background xl:text-3xl">
          Set up Kramashah around the way you work.
        </h2>

        {/* Supporting copy */}
        <p className="mt-3 text-sm leading-relaxed text-background/70">
          Choose your business category, configure your services and team, and start
          managing work from one connected workspace.
        </p>

        {/* Category cards */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-background/10 bg-background/5 p-3"
            >
              <p className="text-xs font-semibold text-background/90">{c.name}</p>
              <p className="mt-0.5 text-[10px] text-background/50">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Onboarding steps */}
        <div className="mt-6 space-y-2.5">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "border border-background/20 text-background/40"
                }`}
              >
                {i === 0 ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i === 0 ? "font-medium text-background/90" : "text-background/50"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Product preview */}
        <div className="mt-6 rounded-xl border border-background/10 bg-background/5 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-wide text-background/40">
            What you'll manage
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCT_MODULES.map((m) => (
              <div
                key={m}
                className="flex items-center gap-1.5 text-xs text-background/70"
              >
                <span className="h-1 w-1 rounded-full bg-background/40" />
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Trust points */}
        <div className="mt-6 border-t border-background/10 pt-4">
          <ul className="space-y-1.5">
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-xs text-background/60"
              >
                <Check className="h-3 w-3 text-background/40" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}