import React from "react";

const stats = [
  { value: "6+", label: "Core modules" },
  { value: "GST", label: "Ready billing" },
  { value: "24/7", label: "Cloud access" },
  { value: "∞", label: "Free plan events" },
];

export default function StatsBar() {
  return (
    <section className="border-y border-border/60 bg-card/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-heading text-2xl sm:text-3xl font-bold text-gradient">{s.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}