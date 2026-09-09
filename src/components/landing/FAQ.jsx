import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
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
    a: "Yes. Team assignments use date ranges and can identify overlapping bookings, so you can see scheduling conflicts before they become problems.",
  },
  {
    q: "What happens if I downgrade my plan?",
    a: "Your existing business data isn't deleted when you downgrade. You keep all your clients, projects, events and financial records. Only the features available to your new plan tier change.",
  },
  {
    q: "Is Kramashah a mobile app?",
    a: "Kramashah is a responsive web application with PWA support and can be installed on supported devices. It is not a native Android or iOS app.",
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base font-semibold text-foreground">{faq.q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#F7F9FC] py-20 md:py-28">
      <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-white px-6">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}