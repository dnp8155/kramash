import React from "react";
import { Camera, PartyPopper, Building2, Home, User, Building, Briefcase, Layers } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

// Bento layout (4 columns on desktop, 2 on smaller screens). `span` holds literal Tailwind classes so they are
// kept at build time; `feature` tiles get the larger treatment.
const INDUSTRIES = [
  { icon: Camera, name: "Photography", desc: "Weddings, pre-weddings, corporate shoots and album deliveries.", span: "col-span-2 lg:row-span-2", feature: true },
  { icon: PartyPopper, name: "Event Management", desc: "Multi-day events, vendor coordination and crew job sheets.", span: "col-span-2", feature: true },
  { icon: Building2, name: "Architecture", desc: "Project sites, site visits and phased project billing.", span: "" },
  { icon: Home, name: "Interior Design", desc: "Design projects, site measurements and milestone billing.", span: "" },
  { icon: User, name: "Freelancers", desc: "Solo professionals managing clients, projects and payments.", span: "" },
  { icon: Building, name: "Studios", desc: "Creative studios with teams, services and multiple projects.", span: "" },
  { icon: Briefcase, name: "Creative Agencies", desc: "Agencies managing clients, deliverables and project finances.", span: "col-span-2", feature: true },
  { icon: Layers, name: "Other Service Businesses", desc: "Any service business — configure your own roles and workflows.", span: "col-span-2 lg:col-span-4", wide: true },
];

export default function Industries() {
  return (
    <section id="industries" className="py-20 sm:py-28 bg-[#FAF8F4]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Industries</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            Built for Your Industry. Adaptable to Your Workflow.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            Kramasha automatically adapts its terminology — photographers see Events, architects see Projects. Configure your own roles and services for anything else.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 40} className={ind.span}>
              <div
                className={`group relative overflow-hidden rounded-2xl border border-[#E8E3DB] h-full ${
                  ind.feature ? "bg-gradient-to-br from-white to-[#F7F1E3] p-6 sm:p-8" : "bg-white p-4 sm:p-6"
                } ${ind.wide ? "flex flex-row items-center gap-4 sm:gap-6 p-5 sm:p-6" : "flex flex-col"}`}
              >
                {/* Oversized faded icon in the corner of the big tiles */}
                {ind.feature && (
                  <ind.icon className="absolute -right-4 -bottom-4 w-28 h-28 sm:w-36 sm:h-36 text-[#C8A95E]/10 group-hover:text-[#C8A95E]/20 transition-colors duration-300 pointer-events-none" strokeWidth={1.25} />
                )}
                <div className={`relative rounded-xl bg-[#C8A95E]/10 flex items-center justify-center text-[#C8A95E] group-hover:scale-110 transition-transform duration-300 shrink-0 ${
                  ind.feature ? "w-12 h-12 sm:w-14 sm:h-14 mb-5 sm:mb-8" : ind.wide ? "w-12 h-12" : "w-10 h-10 sm:w-12 sm:h-12 mb-4 sm:mb-5"
                }`}>
                  <ind.icon className={ind.feature ? "w-6 h-6 sm:w-7 sm:h-7" : "w-5 h-5 sm:w-6 sm:h-6"} strokeWidth={1.75} />
                </div>
                <div className="relative">
                  <h3 className={`font-heading font-semibold text-[#1A1A1A] mb-1.5 sm:mb-2 ${ind.feature ? "text-lg sm:text-xl" : "text-sm sm:text-base"}`}>{ind.name}</h3>
                  <p className={`text-[#8A8580] leading-relaxed ${ind.feature ? "text-sm sm:text-base max-w-xs" : "text-xs sm:text-sm"}`}>{ind.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
