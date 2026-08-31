import React from "react";
import { Camera, CalendarRange, Compass, Wand2 } from "lucide-react";

const audience = [
  {
    icon: CalendarRange,
    title: "Event managers",
    body: "Juggling vendors, coordinators, and a dozen moving parts per event.",
  },
  {
    icon: Camera,
    title: "Photographers & videographers",
    body: "Running crews across shoots, edits, and deliverables.",
  },
  {
    icon: Compass,
    title: "Architects & interior teams",
    body: "Managing projects, consultants, and contractors.",
  },
  {
    icon: Wand2,
    title: "Freelancers & small studios",
    body: "Makeup artists, decorators, editors, drone operators — track jobs and payments without an accountant.",
  },
];

export default function AboutForWho() {
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Who it's for</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            If your business runs on events, a team, and money moving — it's built for you.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {audience.map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <a.icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-1.5">{a.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}