import { Check, ArrowRight } from "lucide-react";

const CATEGORIES = ["Photography", "Event Management", "Architecture", "Other Services"];

const TRUST_POINTS = [
  "Workspace-based access",
  "GST-ready quotations",
  "Team & financial tracking",
];

export default function AuthProductPanel() {
  return (
    <div className="flex h-full min-h-screen flex-col justify-center bg-foreground px-8 py-12 xl:px-14">
      <div className="mx-auto w-full max-w-md">
        {/* Headline */}
        <div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-background xl:text-3xl">
            Your business, organized in one place.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-background/70 xl:text-base">
            From client details to projects, team assignments, quotations and payments —
            Kramashah keeps your workflow connected.
          </p>
        </div>

        {/* Category chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span
              key={c}
              className="rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-medium text-background/70"
            >
              {c}
            </span>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="mt-8 rounded-2xl border border-background/10 bg-background/5 p-5 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-background/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                K
              </div>
              <span className="text-xs font-semibold text-background/90">Dashboard</span>
            </div>
            <span className="text-[10px] text-background/40">Demo preview</span>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-background/10 bg-background/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-background/50">Received</p>
              <p className="mt-1 text-lg font-bold text-background">₹82,450</p>
            </div>
            <div className="rounded-lg border border-background/10 bg-background/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-background/50">Pending</p>
              <p className="mt-1 text-lg font-bold text-background">₹40,000</p>
            </div>
          </div>

          {/* Project card */}
          <div className="mt-3 rounded-lg border border-background/10 bg-background/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-background/90">Residence Design</p>
                <p className="text-[10px] text-background/50">Architecture · Mumbai</p>
              </div>
              <span className="rounded-full bg-background/10 px-2 py-0.5 text-[10px] font-medium text-background/70">
                In Progress
              </span>
            </div>
          </div>

          {/* Quotation + Team */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-background/10 bg-background/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-background/50">Quotation</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-background/50" />
                <span className="text-xs font-medium text-background/90">Accepted</span>
              </div>
            </div>
            <div className="rounded-lg border border-background/10 bg-background/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-background/50">Team</p>
              <p className="mt-1 text-xs font-medium text-background/90">6 / 8 assigned</p>
            </div>
          </div>
        </div>

        {/* Workflow */}
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-background/50">
          <span>Client</span>
          <ArrowRight className="h-3 w-3 text-background/30" />
          <span>Project</span>
          <ArrowRight className="h-3 w-3 text-background/30" />
          <span>Team</span>
          <ArrowRight className="h-3 w-3 text-background/30" />
          <span>Quotation</span>
          <ArrowRight className="h-3 w-3 text-background/30" />
          <span>Payment</span>
        </div>

        {/* Trust microcopy */}
        <div className="mt-8 border-t border-background/10 pt-6">
          <p className="text-xs text-background/50">
            One workspace for your day-to-day business operations.
          </p>
          <ul className="mt-3 space-y-1.5">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 text-xs text-background/60">
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