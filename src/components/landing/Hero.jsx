import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Layers, FileText, Cloud, Workflow } from "lucide-react";
import { LANDING_CATEGORIES } from "./categories";
import DashboardMockup from "./DashboardMockup";

const PROOF_POINTS = [
  { icon: Layers, label: "4 Business Types", sub: "Multi-industry ready" },
  { icon: FileText, label: "GST Ready", sub: "Professional quotations" },
  { icon: Cloud, label: "24 / 7", sub: "Cloud access" },
  { icon: Workflow, label: "One Workspace", sub: "From client to profit" },
];

export default function Hero() {
  const [activeKey, setActiveKey] = useState(LANDING_CATEGORIES[0].key);
  const activeCategory = LANDING_CATEGORIES.find((c) => c.key === activeKey);

  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-16 sm:pt-32">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Hero text */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for Service Businesses
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Run your entire service business from one workspace.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Manage clients, projects or events, team availability, quotations, payments and
            profitability without juggling spreadsheets and disconnected tools.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              data-cta="hero_start_free"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#product"
              data-cta="hero_explore"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-7 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Explore Kramashah
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> Setup in minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> GST-ready quotations
            </span>
          </div>
        </div>

        {/* Category switcher */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {LANDING_CATEGORIES.map((cat) => {
            const isActive = cat.key === activeKey;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveKey(cat.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-white text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }`}
                aria-pressed={isActive}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Dashboard mockup */}
        <div className="mt-8 px-0 lg:px-8">
          <DashboardMockup category={activeCategory} />
        </div>
      </div>

      {/* Product proof strip */}
      <div className="mx-auto mt-16 max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
          {PROOF_POINTS.map((point, i) => (
            <div key={i} className="flex items-center gap-3 bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <point.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{point.label}</p>
                <p className="text-xs text-muted-foreground">{point.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}