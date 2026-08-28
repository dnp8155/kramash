import React from "react";
import { Image } from "@/components/ui/image";
import { Check } from "lucide-react";

const blocks = [
  {
    eyebrow: "Quotations",
    title: "Professional quotes that close deals",
    desc: "Build itemised quotations with services, roles and custom lines. Apply discounts, auto-calculate GST, and send a polished PDF to your client in minutes.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1000&q=80",
    points: ["Line-item services & roles", "CGST/SGST & IGST modes", "One-click PDF export"],
  },
  {
    eyebrow: "Team",
    title: "See who's free, who's booked — instantly",
    desc: "A shared availability calendar maps every crew member's assignments across events, so you never double-book your lead photographer again.",
    image: "https://images.unsplash.com/photo-1505236858219-8359ebdaefa5?w=1000&q=80",
    points: ["Monthly availability grid", "Per-event crew assignment", "Role-based rate tracking"],
  },
  {
    eyebrow: "Financials",
    title: "Know your numbers, event by event",
    desc: "Track client receipts, team payouts and expenses. Watch profit unfold per event and across financial years — no spreadsheets required.",
    image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1000&q=80",
    points: ["Income, expense & profit view", "Yearly financial summaries", "CSV export for accounting"],
  },
];

export default function Showcase() {
  return (
    <section id="showcase" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-20">
        {blocks.map((b, i) => (
          <div
            key={b.title}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${
              i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border group">
              <Image
                src={b.image}
                alt={b.title}
                className="w-full h-64 sm:h-80 transition-transform duration-500 group-hover:scale-105"
                fittingType="fill"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
                {b.eyebrow}
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {b.title}
              </h3>
              <p className="mt-4 text-muted-foreground text-base leading-relaxed">{b.desc}</p>
              <ul className="mt-6 space-y-3">
                {b.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-success" strokeWidth={3} />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}