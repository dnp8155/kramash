import React from "react";
import { Camera, PartyPopper, Building2, Briefcase } from "lucide-react";

const industries = [
  {
    icon: Camera,
    name: "Photography",
    desc: "Weddings, pre-weddings, corporate shoots and album deliveries with team scheduling.",
    tags: ["Weddings", "Pre-Wedding", "Corporate", "Albums"],
  },
  {
    icon: PartyPopper,
    name: "Event Management",
    desc: "Multi-day events, vendor coordination, venue management and crew job sheets.",
    tags: ["Weddings", "Conferences", "Gala Nights", "Festivals"],
  },
  {
    icon: Building2,
    name: "Architecture",
    desc: "Project sites, site visits, measurement trips and phased project billing.",
    tags: ["Site Visits", "Projects", "Phased Billing", "Site Teams"],
  },
  {
    icon: Briefcase,
    name: "Other Services",
    desc: "Any service business — configure your own roles, services, labels and workflows.",
    tags: ["Custom Roles", "Custom Services", "Flexible Labels"],
  },
];

export default function Industries() {
  return (
    <section id="industries" className="py-20 sm:py-28 border-t border-[#E5E5E5] bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#666] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58220]" />
            Multi-industry
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
            Built for your industry. Adapts to your language.
          </h2>
          <p className="text-[#666] text-base sm:text-lg leading-relaxed">
            Kramasha automatically adapts its terminology — photographers see Events, architects see Projects. Configure your own roles and services for anything else.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {industries.map((ind) => (
            <div
              key={ind.name}
              className="group rounded-2xl border border-[#E5E5E5] bg-white p-6 hover:shadow-lg hover:border-[#F58220]/30 transition-all duration-300 flex flex-col"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F58220]/10 flex items-center justify-center mb-5 text-[#F58220] group-hover:scale-110 transition-transform duration-300">
                <ind.icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{ind.name}</h3>
              <p className="text-sm text-[#666] leading-relaxed mb-4">{ind.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {ind.tags.map((t) => (
                  <span key={t} className="text-[10px] font-medium text-[#666] bg-[#F9F9F9] border border-[#E5E5E5] rounded-full px-2.5 py-1">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}