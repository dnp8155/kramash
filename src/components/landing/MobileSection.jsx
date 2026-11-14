import React from "react";
import { Smartphone, CalendarCheck, Users, Briefcase, Wallet, Calendar, BarChart3 } from "lucide-react";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  { icon: CalendarCheck, label: "Events" },
  { icon: Users, label: "Clients" },
  { icon: Users, label: "Team" },
  { icon: Briefcase, label: "Services" },
  { icon: Wallet, label: "Payments" },
  { icon: Calendar, label: "Calendar" },
  { icon: BarChart3, label: "Financials" },
];


export default function MobileSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">On the go</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4 leading-tight">
              Your Business in Your Pocket.
            </h2>
            <p className="text-[#888] text-base leading-relaxed mb-6">
              Install Kramasha on your phone or desktop, or just use it in the browser. Manage everything from anywhere — no app store needed.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-white">
                  <f.icon className="w-4 h-4 text-[#C8A95E] shrink-0" strokeWidth={1.75} />
                  {f.label}
                </div>
              ))}
            </div>
            <a href="#install" onClick={(e) => { e.preventDefault(); document.getElementById("install")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#C8A95E] px-6 text-sm font-semibold text-white hover:bg-[#D4B876] transition-colors mb-6">How to install as app</a>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <Smartphone className="w-4 h-4 text-[#C8A95E]" />
              Works on mobile and desktop browsers
            </div>
          </Reveal>

          <Reveal delay={100} className="flex justify-center lg:justify-end">
            <MobilePreview shot="/landing/team-pay-phone.webp" shotAlt="Team payments on a phone in Kramasha" />
          </Reveal>
        </div>

      </div>
    </section>
  );
}