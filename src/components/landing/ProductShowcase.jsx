import { Check } from "lucide-react";
import QuotationMockup from "./QuotationMockup";
import TeamMockup from "./TeamMockup";
import FinancialsMockup from "./FinancialsMockup";

const SHOWCASES = [
  {
    eyebrow: "Quotations",
    heading: "Professional quotes without the document chaos.",
    copy: "Build quotations from your services and rates, apply discounts and optional GST, then generate a polished branded PDF.",
    bullets: ["Services and custom items", "CGST/SGST & IGST support", "Branded PDF export"],
    mockup: <QuotationMockup />,
  },
  {
    eyebrow: "Team",
    heading: "Know who's free before you assign the work.",
    copy: "See team availability, assignment dates and scheduling conflicts from one shared workspace.",
    bullets: ["Role and rate management", "Multi-day availability", "Conflict detection"],
    mockup: <TeamMockup />,
  },
  {
    eyebrow: "Financials",
    heading: "Know your numbers without another spreadsheet.",
    copy: "Track receipts, team payments, expenses, pending balances and actual profitability for every project or event.",
    bullets: ["Received & pending", "Payments & expenses", "Profitability by project/event"],
    mockup: <FinancialsMockup />,
  },
];

function ShowcaseBlock({ eyebrow, heading, copy, bullets, mockup, reverse, id }) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {heading}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                <Check className="h-3 w-3 text-success" />
              </div>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : ""} id={id}>
        {mockup}
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section className="bg-[#F7F9FC] py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-20 md:gap-28">
          {SHOWCASES.map((showcase, i) => (
            <ShowcaseBlock key={i} {...showcase} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}