import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      {/* soft background accents */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-accent/6 blur-3xl" />
        <div className="absolute top-1/3 left-0 w-72 h-72 rounded-full bg-success/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-muted-foreground mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Built for photographers & production teams
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight text-foreground leading-[1.05]">
              Run your entire event business from one{" "}
              <span className="text-gradient">refined workspace</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Bookings, quotations with GST billing, team availability, payments and financial reports — KRAMAS brings every moving part of your event production into one calm, professional dashboard.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/register"
                className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted hover:border-border/80 rounded-xl shadow-sm transition-all"
              >
                <Play className="w-4 h-4" />
                Log in
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Free plan forever
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-warning" />
                GST-ready
              </span>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border">
              <Image
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80"
                alt="Professional event photography setup"
                className="w-full h-[420px] sm:h-[480px]"
                fittingType="fill"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </div>
            {/* floating stat card */}
            <div className="absolute -bottom-5 -left-3 sm:-left-6 glass border border-border rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <span className="text-success font-bold text-sm">₹</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Revenue tracked</div>
                <div className="font-heading text-sm font-bold text-foreground">₹12.4L this year</div>
              </div>
            </div>
            {/* floating badge */}
            <div className="absolute -top-4 -right-3 sm:-right-5 glass border border-border rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-foreground">Live tracking</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}