import React from "react";
import { Check } from "lucide-react";
import TeamPreview from "@/components/landing/previews/TeamPreview";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  "Team members & roles",
  "Bride side / Groom side",
  "Common assignments",
  "Per-day assignment dates",
  "Availability calendar",
  "Payment status tracking",
];

const STATUSES = [
  { label: "Available", color: "#3FC85E" },
  { label: "Upcoming", color: "#C8A95E" },
  { label: "In Progress", color: "#E8A93F" },
  { label: "Completed", color: "#888" },
];

export default function TeamShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-[#F5F3EF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
              <div className="relative">
                <TeamPreview />
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Team & Availability</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
              Know who's free, who's booked and what's happening next.
            </h2>
            <p className="text-[#8A8580] text-base leading-relaxed mb-6">
              Visual availability calendar shows every team member's schedule. Detect double-bookings before they happen.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <Check className="w-4 h-4 text-[#C8A95E] shrink-0" strokeWidth={2.5} />
                  {f}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] bg-white border border-[#E8E3DB] rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}