import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  PartyPopper,
  Compass,
  Wrench,
  Heart,
  Sparkles,
  Sofa,
  Clapperboard,
  ArrowRight,
} from "lucide-react";

const industries = [
  {
    key: "PHOTOGRAPHY",
    icon: Camera,
    title: "Photography & Production Workspace",
    copy: "Manage clients, shoots and events, crew assignments, service packages, quotations and payments from one unified workspace designed specifically for visual creators.",
    presetHeader: "WORKSPACE_PRESET // PHOTO",
    presets: ["✓ Client Enquiry Tracking", "✓ Crew Rate Assigning", "✓ GST PDF Generation"],
  },
  {
    key: "EVENT_MANAGEMENT",
    icon: PartyPopper,
    title: "Event Management & Decor Workspace",
    copy: "Handle multiple vendor timelines, venue allocations, equipment rentals, and crew availability effortlessly with specialized multi-day tracking.",
    presetHeader: "WORKSPACE_PRESET // EVENTS",
    presets: ["✓ Vendor Timeline Sync", "✓ Venue Slot Allocations", "✓ Expense Ledger Tracking"],
  },
  {
    key: "ARCHITECTURE",
    icon: Compass,
    title: "Architecture & Interiors Workspace",
    copy: "Track project phases, milestone billing, architectural deliverables, and client sign-offs in real-time without managing disconnected files.",
    presetHeader: "WORKSPACE_PRESET // ARCH",
    presets: ["✓ Milestone Phase Billing", "✓ Architectural Deliverables", "✓ Client Sign-off Logs"],
  },
  {
    key: "WEDDING_DECOR",
    icon: Heart,
    title: "Wedding & Decor Workspace",
    copy: "Plan weddings and decor projects end-to-end — track vendors, decorators, site visits, client budgets and payments in one place.",
    presetHeader: "WORKSPACE_PRESET // WEDDING",
    presets: ["✓ Vendor & Decorator Tracking", "✓ Site Visit Logs", "✓ Budget vs Actual"],
  },
  {
    key: "MAKEUP_BEAUTY",
    icon: Sparkles,
    title: "Makeup & Beauty Workspace",
    copy: "Book bridal and party appointments, manage artists, trial sessions, packages and collect advance payments with automated reminders.",
    presetHeader: "WORKSPACE_PRESET // BEAUTY",
    presets: ["✓ Appointment Booking", "✓ Bridal Package Builder", "✓ Advance Collection"],
  },
  {
    key: "INTERIOR_DESIGN",
    icon: Sofa,
    title: "Interior Design Workspace",
    copy: "Run design projects with clients, site visits, contractors, vendors, BOQs and milestone billing — all tracked stage by stage.",
    presetHeader: "WORKSPACE_PRESET // INTERIOR",
    presets: ["✓ BOQ & Milestone Billing", "✓ Contractor Management", "✓ Site Visit Tracking"],
  },
  {
    key: "PRODUCTION_HOUSE",
    icon: Clapperboard,
    title: "Production House Workspace",
    copy: "Coordinate shoots, ad films and productions — manage crew, equipment, shoot days, client approvals and vendor payouts.",
    presetHeader: "WORKSPACE_PRESET // PRODUCTION",
    presets: ["✓ Shoot Day Planning", "✓ Equipment & Crew", "✓ Vendor Payouts"],
  },
  {
    key: "OTHER",
    icon: Wrench,
    title: "Other Service Businesses",
    copy: "Configure your own services, team roles and projects while keeping the same powerful Kramasha workflow.",
    presetHeader: "WORKSPACE_PRESET // CUSTOM",
    presets: ["✓ Custom Roles & Services", "✓ Flexible Projects", "✓ Full Finance Suite"],
  },
];

export default function IndustrySection() {
  const [active, setActive] = useState("PHOTOGRAPHY");
  const current = industries.find((i) => i.key === active);

  return (
    <section id="industries" className="py-20 sm:py-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            One platform. Your terminology. Your workflow.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Kramasha adapts to the way your business works instead of forcing every industry into the same vocabulary.
          </p>
        </div>

        {/* Industry tabs */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {industries.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setActive(ind.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                active === ind.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              }`}
            >
              <ind.icon className="w-3.5 h-3.5" />
              {ind.title.replace(" Workspace", "")}
            </button>
          ))}
        </div>

        {/* Active industry card with preset panel */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-4 max-w-lg">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <current.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground">{current.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.copy}</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary pt-1"
              >
                Configure workflow
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-muted/40 rounded-2xl border border-border p-5 w-full md:w-72 shrink-0 space-y-2.5 font-mono text-xs">
              <div className="font-bold border-b border-border pb-2 flex justify-between">
                <span>{current.presetHeader}</span>
                <span className="text-success">ACTIVE</span>
              </div>
              {current.presets.map((p, i) => (
                <div key={i} className="text-muted-foreground">{p}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}