import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, FileText } from "lucide-react";
import { getBusinessTerminology, BUSINESS_CATEGORY_OPTIONS } from "@/lib/businessTerminology";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";

export default function Hero() {
  const [category, setCategory] = useState("PHOTOGRAPHY");
  const term = getBusinessTerminology({ business_category: category });

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
        {/* Copy */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground mb-6 shadow-xs">
            BUILT FOR SERVICE BUSINESSES
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
            Run your entire service business from one workspace.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage clients, projects or events, team availability, quotations, payments and profitability without juggling spreadsheets and disconnected tools.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="hero_start_free h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="hero_explore h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted rounded-xl shadow-sm transition-all"
            >
              See how it works
            </a>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Setup in minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-warning" />
              GST-ready quotations
            </span>
          </div>
        </div>

        {/* Category switcher */}
        <div className="flex justify-center mb-6 overflow-x-auto scrollbar-thin pb-1">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-card shadow-sm">
            {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  category === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.value === "OTHER" ? "Other Services" : opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product preview */}
        <DashboardPreview terminology={term} />
      </div>
    </section>
  );
}