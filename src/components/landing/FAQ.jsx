import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is Kramashah only for photographers and event businesses?",
    a: "No. Photography, Event Management and Architecture have ready-made workflows, while Other Service Business lets you configure your own roles, services and projects.",
  },
  {
    q: "Can architects use Projects instead of Events?",
    a: "Yes. Kramashah automatically adapts its terminology based on your business category, so Architecture workspaces use Projects, Project Sites and Project Teams.",
  },
  {
    q: "Can I use Kramashah without GST?",
    a: "Yes. GST is optional. Non-GST businesses can use quotations and financial features normally.",
  },
  {
    q: "Does Kramashah support GST billing?",
    a: "Kramashah supports optional GST in quotations, including CGST/SGST and IGST modes. It does not handle statutory GST filing or compliance certification.",
  },
  {
    q: "Can my team availability be tracked?",
    a: "Yes. Team assignments use date ranges and can identify overlapping bookings, so you can see who's free and who's booked at a glance.",
  },
  {
    q: "What happens if I downgrade my plan?",
    a: "Your existing business data isn't deleted if you downgrade. You keep all your clients, projects, quotations and financial records — only plan-specific features and limits change.",
  },
  {
    q: "Is Kramashah a mobile app?",
    a: "Kramashah is a responsive web application with PWA support and can be installed on supported devices. It is not a native Android or iOS app.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-20 sm:py-24 bg-[#F7F9FC] border-y border-border/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary mb-4">
            FAQ
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Questions, answered
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card shadow-xs overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="font-heading text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}