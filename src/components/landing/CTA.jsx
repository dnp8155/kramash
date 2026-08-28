import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-sidebar text-sidebar-foreground px-6 py-14 sm:px-12 sm:py-16 text-center shadow-xl">
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              Start managing your events the professional way
            </h2>
            <p className="mt-4 text-sidebar-muted max-w-xl mx-auto">
              Join photographers and production teams who replaced chaos with clarity. Free to start, upgrade when you grow.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 rounded-xl shadow-lg transition-opacity"
              >
                Create your free account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="h-12 px-6 inline-flex items-center justify-center text-sm font-semibold border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-hover rounded-xl transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}