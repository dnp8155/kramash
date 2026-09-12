import React from "react";
import { Check, X, Camera, Package, Users, Briefcase, FileText, ExternalLink, Receipt, Wallet, ClipboardList } from "lucide-react";
import QuotationPreview from "@/components/landing/previews/QuotationPreview";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  { icon: Package, label: "Packages" },
  { icon: Users, label: "Team" },
  { icon: Briefcase, label: "Services" },
  { icon: Camera, label: "Add-ons" },
  { icon: FileText, label: "Quotation" },
  { icon: ExternalLink, label: "Client Portal" },
  { icon: Receipt, label: "Invoice" },
  { icon: Wallet, label: "Payments" },
  { icon: ClipboardList, label: "Job Sheet" },
];

export default function PhotographyShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Photography Workflow</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4 leading-tight">
              Built for the Way Photographers Actually Work.
            </h2>
            <p className="text-[#888] text-base leading-relaxed mb-6">
              From packages and add-ons to client-facing quotations and job sheets — everything a photography studio needs.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {FEATURES.map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#141414] border border-[#2A2A2A] rounded-full px-3 py-1.5">
                  <f.icon className="w-3 h-3 text-[#C8A95E]" />
                  {f.label}
                </span>
              ))}
            </div>

            <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
              <div className="text-xs font-semibold text-[#C8A95E] mb-3">Client-facing documents show:</div>
              <div className="space-y-2 mb-4">
                {["Wedding Photography Package — ₹50,000", "Drone Coverage Add-on — ₹5,000"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-white">
                    <Check className="w-3.5 h-3.5 text-[#3FC85E] shrink-0" strokeWidth={2.5} />
                    {t}
                  </div>
                ))}
              </div>
              <div className="text-xs font-semibold text-[#888] mb-2">They do NOT show:</div>
              <div className="space-y-1.5">
                {["Photographer internal rate", "Freelancer cost", "Internal margin", "Team payment"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-[#888]">
                    <X className="w-3.5 h-3.5 text-[#E84A3F] shrink-0" strokeWidth={2.5} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
            <div className="relative">
              <QuotationPreview />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}