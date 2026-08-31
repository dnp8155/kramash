import React, { useState } from "react";
import {
  Camera,
  PartyPopper,
  Compass,
  Wrench,
  Heart,
  Sparkles,
  Sofa,
  Clapperboard,
} from "lucide-react";

const industries = [
  {
    key: "PHOTOGRAPHY",
    icon: Camera,
    title: "Photography",
    copy: "Manage clients, shoots and events, crew assignments, service packages, quotations and payments from one workspace.",
    chips: ["Events", "Crew", "Services", "Quotations", "Payments"],
  },
  {
    key: "EVENT_MANAGEMENT",
    icon: PartyPopper,
    title: "Event Management",
    copy: "Keep every event, team assignment, service, quotation and financial update organized from planning to completion.",
    chips: ["Events", "Team", "Availability", "Services", "Financials"],
  },
  {
    key: "ARCHITECTURE",
    icon: Compass,
    title: "Architecture",
    copy: "Manage clients, projects, project sites, teams, professional services, quotations and project financials without event-specific workflows.",
    chips: ["Projects", "Project Sites", "Project Team", "Services", "Billing"],
  },
  {
    key: "WEDDING_DECOR",
    icon: Heart,
    title: "Wedding & Decor",
    copy: "Plan weddings and decor projects end-to-end — track vendors, decorators, site visits, client budgets and payments in one place.",
    chips: ["Weddings", "Decorators", "Vendors", "Budgets", "Payments"],
  },
  {
    key: "MAKEUP_BEAUTY",
    icon: Sparkles,
    title: "Makeup & Beauty",
    copy: "Book bridal and party appointments, manage artists, trial sessions, packages and collect advance payments with automated reminders.",
    chips: ["Appointments", "Artists", "Bridal Packages", "Trials", "Advances"],
  },
  {
    key: "INTERIOR_DESIGN",
    icon: Sofa,
    title: "Interior Design",
    copy: "Run design projects with clients, site visits, contractors, vendors, BOQs and milestone billing — all tracked stage by stage.",
    chips: ["Projects", "Site Visits", "Contractors", "BOQ", "Milestone Billing"],
  },
  {
    key: "PRODUCTION_HOUSE",
    icon: Clapperboard,
    title: "Production House",
    copy: "Coordinate shoots, ad films and productions — manage crew, equipment, shoot days, client approvals and vendor payouts.",
    chips: ["Shoots", "Crew", "Equipment", "Approvals", "Vendor Payouts"],
  },
  {
    key: "OTHER",
    icon: Wrench,
    title: "Other Service Businesses",
    copy: "Configure your own services, team roles and projects while keeping the same powerful Kramashah workflow.",
    chips: ["Custom Roles", "Custom Services", "Projects", "Quotations", "Finance"],
    note: "Consulting, Agencies, Catering, Fitness Trainers and more — if you run a service business, Kramashah fits.",
  },
];

export default function IndustrySection() {
  const [active, setActive] = useState("PHOTOGRAPHY");
  const current = industries.find((i) => i.key === active);

  return (
    <section id="industries" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            BUILT AROUND YOUR BUSINESS
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            One platform. Your terminology. Your workflow.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            Kramashah adapts to the way your business works instead of forcing every industry into the same vocabulary.
          </p>
        </div>

        {/* Industry tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {industries.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setActive(ind.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active === ind.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              <ind.icon className="w-4 h-4" />
              {ind.title}
            </button>
          ))}
        </div>

        {/* Active industry card */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <current.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground">{current.title}</h3>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed mb-6">{current.copy}</p>
          <div className="flex flex-wrap gap-2">
            {current.chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium border border-primary/15"
              >
                {chip}
              </span>
            ))}
          </div>
          {current.note && (
            <p className="mt-5 text-sm text-muted-foreground italic border-l-2 border-border pl-3">
              {current.note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}