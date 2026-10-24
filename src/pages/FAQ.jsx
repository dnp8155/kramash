import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { faqContent, FAQ_CATEGORIES, plainAnswer } from "@/constants/faqContent";
import FaqAnswer from "@/components/landing/FaqAnswer";
import { EASE, useReducedMotion } from "@/lib/motionVariants";
import useSEO from "@/hooks/useSEO";
import Logo from "@/components/common/Logo";
import usePageTitle from "@/hooks/usePageTitle";

export default function FAQ() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  const slugs = useMemo(() => new Set(faqContent.map((f) => f.slug)), []);

  // Open an answer and scroll it into view (used by in-answer links and /faq#slug).
  const jumpTo = (slug) => {
    const idx = faqContent.findIndex((f) => f.slug === slug);
    if (idx < 0) return;
    setOpen(idx);
    window.history.replaceState(null, "", `/faq#${slug}`);
    setTimeout(() => document.getElementById(slug)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 50);
  };
  useEffect(() => {
    const slug = location.hash.slice(1);
    if (slug && slugs.has(slug)) jumpTo(slug);
  }, [location.hash]);

  useSEO({
    title: "FAQ - Kramasha",
    description: "Frequently asked questions about Kramasha — the all-in-one business management platform for photographers, event managers and creative businesses in India. Learn about pricing, features, GST billing, team management, client portals and more.",
    keywords: "Kramasha FAQ, photography business software FAQ, event management software India, photography CRM pricing, GST billing software, client portal FAQ, team management software, milestone payment tracking, creative business platform India",
    path: "/faq",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqContent.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: plainAnswer(f.a) },
      })),
    },
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "FAQ", url: "/faq" },
    ],
  });
  usePageTitle("FAQ"); // after useSEO so the short tab title wins

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors">
          <span className="w-8 h-8 rounded-full border border-[#E8E3DB] bg-[#FAF8F4] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back
        </button>
          <Link to="/" aria-label="Kramasha home" className="inline-flex items-center gap-2 text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors">
            Home
            <Logo size={36} className="rounded-xl" />
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/5 text-[#1A1A1A] flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#1A1A1A]">Frequently Asked Questions</h1>
        </div>
        <p className="text-sm text-[#8A8580] mb-8">
          Everything you need to know about Kramasha — plans and pricing, features, data security and setup.
        </p>

        <div className="space-y-10">
          {FAQ_CATEGORIES.map((cat) => {
            const items = faqContent.map((item, index) => ({ item, index })).filter(({ item }) => item.category === cat.key);
            if (items.length === 0) return null;
            return (
              <section key={cat.key} aria-labelledby={`faq-${cat.key}`}>
                <h2 id={`faq-${cat.key}`} className="font-heading text-xs font-semibold uppercase tracking-wider text-[#8A8580] mb-3 px-1">{cat.label}</h2>
                <div className="space-y-3">
                  {items.map(({ item, index }) => (
                    <div key={index} id={item.slug} className="rounded-xl border border-[#E8E3DB] bg-[#FAF8F4] overflow-hidden scroll-mt-6">
                      <button
                        onClick={() => setOpen(open === index ? -1 : index)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                        aria-expanded={open === index}
                      >
                        <span className="font-heading text-sm font-semibold text-[#1A1A1A]">{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-[#8A8580] shrink-0 transition-transform duration-300 ${open === index ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {open === index && (
                          <motion.div
                            initial={reduce ? false : { height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={reduce ? { duration: 0 } : { height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.2 } }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 text-sm text-[#5A5650] leading-relaxed"><FaqAnswer text={item.a} knownSlugs={slugs} onJump={jumpTo} linkClassName="font-medium text-[#1A1A1A] underline underline-offset-2 hover:text-[#8A6D2B]" /></div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}