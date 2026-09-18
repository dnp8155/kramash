import React from "react";
import { Camera, PartyPopper, Building2, Home, User, Building, Briefcase, Layers } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const INDUSTRIES = [
  { icon: Camera, name: "Photography", desc: "Weddings, pre-weddings, corporate shoots and album deliveries." },
  { icon: PartyPopper, name: "Event Management", desc: "Multi-day events, vendor coordination and crew job sheets." },
  { icon: Building2, name: "Architecture", desc: "Project sites, site visits and phased project billing." },
  { icon: Home, name: "Interior Design", desc: "Design projects, site measurements and milestone billing." },
  { icon: User, name: "Freelancers", desc: "Solo professionals managing clients, projects and payments." },
  { icon: Building, name: "Studios", desc: "Creative studios with teams, services and multiple projects." },
  { icon: Briefcase, name: "Creative Agencies", desc: "Agencies managing clients, deliverables and project finances." },
  { icon: Layers, name: "Other Service Businesses", desc: "Any service business — configure your own roles and workflows." },
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 40}>
              <div className="group rounded-2xl border border-[#E8E3DB] bg-white p-6 hover:shadow-lg hover:border-[#C8A95E]/30 transition-all duration-300 flex flex-col h-full">
                <div className="w-12 h-12 rounded-xl bg-[#C8A95E]/10 flex items-center justify-center mb-5 text-[#C8A95E] group-hover:scale-110 transition-transform duration-300">
                  <ind.icon className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h3 className="font-heading text-base font-semibold text-[#1A1A1A] mb-2">{ind.name}</h3>
                <p className="text-sm text-[#8A8580] leading-relaxed">{ind.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}