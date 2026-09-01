import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            OUR STORY
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
            We're building the workspace we wished we had while running the chaos.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            <span className="font-heading font-semibold text-foreground">KRAMAS</span> — <span className="italic">क्रमशः</span> — means "in sequence, one step at a time." That's how a service business should actually run: not scattered across five WhatsApp chats and three Excel sheets, but in order, in one place.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted rounded-xl shadow-sm transition-all"
            >
              See the product
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}