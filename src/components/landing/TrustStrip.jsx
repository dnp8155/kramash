import React from "react";

const CATEGORIES = [
  "Photography Studios",
  "Event Companies",
  "Independent Creators",
  "Studio Teams",
  "Freelancers",
  "Agencies",
];

export default function TrustStrip() {
  return (
    <section className="py-8 border-y border-[#E8E3DB] bg-[#FAF8F4]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {CATEGORIES.map((c) => (
            <span key={c} className="text-xs font-medium text-[#8A8580] tracking-wide">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}