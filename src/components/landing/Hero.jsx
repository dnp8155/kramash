import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { getBusinessTerminology, BUSINESS_CATEGORY_OPTIONS } from "@/lib/businessTerminology";
import DashboardPreview from "@/components/landing/previews/DashboardPreview";

export default function Hero() {
  const [category, setCategory] = useState("PHOTOGRAPHY");
  const term = getBusinessTerminology({ business_category: category });

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 text-center flex flex-col items-center">
        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>The operating system for independent service studios</span>
          <span className="text-muted-foreground">• Zero spreadsheet friction</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight text-foreground leading-[1.08] max-w-4xl mb-6">
          Run your entire service business from one workspace.
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed mb-10">
          Manage clients, projects or events, team availability, quotations, payments and profitability without juggling spreadsheets and disconnected tools.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
          <Link
            to="/register"
            className="hero_start_free h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover rounded-full shadow-md shadow-primary/20 transition-all"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="hero_explore h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-medium border border-border bg-muted/60 text-foreground hover:bg-muted rounded-full transition-all"
          >
            See how it works
          </a>
        </div>

        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
          <span>No credit card required</span> • <span>GST-ready quotations</span>
        </p>

        {/* Category switcher pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium border shadow-xs transition-all ${
                category === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
              }`}
            >
              {opt.value === "OTHER" ? "Other Services" : opt.label}
            </button>
          ))}
        </div>

        {/* Product preview */}
        <div className="mt-14 w-full">
          <DashboardPreview terminology={term} />
        </div>
      </div>
    </section>
  );
}