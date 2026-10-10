import React from "react";
import { Check } from "lucide-react";
import ClientPortalPreview from "@/components/landing/previews/ClientPortalPreview";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  "Project details",
  "Quotation with e-sign",
  "Payment milestones",
  "Invoices & documents",
  "Event information",
  "Payment status",
];

export default function ClientPortalShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-[#F5F3EF]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
              <div className="relative">
                <ClientPortalPreview />
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Client Portal</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
              Keep clients informed without endless WhatsApp messages.
            </h2>
            <p className="text-[#8A8580] text-base leading-relaxed mb-6">
              Give every client a clean, professional portal where they can review quotations, sign online, track milestones and download invoices — anytime, without calling you.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <Check className="w-4 h-4 text-[#C8A95E] shrink-0" strokeWidth={2.5} />
                  {f}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}