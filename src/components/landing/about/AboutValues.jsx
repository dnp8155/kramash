import React from "react";
import { ShieldCheck, Layers, WifiOff, HeartHandshake } from "lucide-react";

const values = [
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Every workspace is isolated at the database level. Nobody else can see your events, clients, or payments — not other businesses, not us browsing for fun.",
  },
  {
    icon: Layers,
    title: "Simple by default",
    body: "Setup in minutes with sensible presets for your industry. You're never starting from a blank screen, and you never need an accountant to use it.",
  },
  {
    icon: WifiOff,
    title: "Works where you work",
    body: "Installable as a PWA on phone or desktop. Core flows keep working on a poor or lost connection and sync the moment you're back online.",
  },
  {
    icon: HeartHandshake,
    title: "Built with real businesses",
    body: "We're building this in the loop with real studios and event teams. If something feels off or missing, we want to hear about it — it shapes what we build next.",
  },
];

export default function AboutValues() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">What we believe</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
          Principles we build against.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {values.map((v) => (
          <div
            key={v.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <v.icon className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}