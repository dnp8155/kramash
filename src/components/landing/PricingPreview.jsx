import React from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "Perfect for solo photographers getting started.",
    features: [
      "Up to 5 events / month",
      "Client & team management",
      "Basic quotations (no GST)",
      "Financial tracking",
      "1 workspace",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/ month",
    desc: "For growing teams that need the full toolkit.",
    features: [
      "Unlimited events",
      "GST billing (CGST/SGST & IGST)",
      "Online quotation signing",
      "Smart reminders & notifications",
      "Rate estimator",
      "Priority support",
    ],
    cta: "Start Pro trial",
    highlight: true,
  },
];

export default function PricingPreview() {
  return (
    <section id="pricing" className="py-20 sm:py-24 bg-card/40 border-y border-border/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            PRICING
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            Start free, upgrade when you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-7 transition-all ${
                p.highlight
                  ? "border-primary/40 bg-card shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border bg-card shadow-card hover:shadow-card-hover"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-md">
                  <Sparkles className="w-3 h-3" />
                  Most popular
                </div>
              )}
              <h3 className="font-heading text-xl font-bold text-foreground">{p.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-bold text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-success" strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-7 h-11 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {p.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}