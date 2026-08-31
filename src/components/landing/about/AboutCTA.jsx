import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function AboutCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground px-6 sm:px-12 py-14 sm:py-20 text-center shadow-xl">
        <div className="absolute inset-0 -z-0 opacity-20 bg-grid" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
            Run your business in order.
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed mb-8">
            Kramasha is free during beta — the full app, including everything currently marked Pro. Start your workspace in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl shadow-md transition-all"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/faq"
              className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 rounded-xl transition-all"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}