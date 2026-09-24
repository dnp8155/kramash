import React from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Scale, Mail, MapPin, Calendar } from "lucide-react";
import { termsOfServiceContent } from "@/lib/legalContent";
import useSEO from "@/hooks/useSEO";

export default function TermsOfService() {
  const navigate = useNavigate();

  useSEO({
    title: "Terms of Service — Kramasha Business Management Platform",
    description: "Read the terms of service for Kramasha, the all-in-one business management platform for photographers, event managers and creative businesses in India.",
    keywords: "Kramasha terms of service, business management software terms, photography software terms India, event management platform terms, SaaS terms India",
    path: "/terms",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Terms of Service — Kramasha",
      description: "Terms of service for Kramasha business management platform.",
      url: "https://www.kramasha.com/terms",
      publisher: { "@type": "Organization", name: "Kramasha", url: "https://www.kramasha.com" },
    },
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Terms of Service", url: "/terms" },
    ],
  });

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <div className="h-1 bg-logo-gradient" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors mb-8"
        >
          <span className="w-8 h-8 rounded-full border border-[#E8E3DB] bg-[#FAF8F4] flex items-center justify-center hover:border-[#1A1A1A]/20 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8E3DB] shadow-sm mb-8">
          <div className="absolute inset-0 bg-mesh opacity-60" />
          <div className="relative px-6 sm:px-10 py-8 sm:py-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-logo-gradient flex items-center justify-center shadow-md">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8580] mb-0.5">Legal Document</p>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#1A1A1A] leading-tight">Terms of Service</h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-[#5A5650] mb-6">
              Kramasha — Creative Business Management Platform
            </p>

            <div className="flex flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F4] border border-[#E8E3DB]">
                <Calendar className="w-3.5 h-3.5 text-[#C8A95E]" />
                <span className="text-xs font-medium text-[#5A5650]">Trial: 19 Sep 2026</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F4] border border-[#E8E3DB]">
                <Calendar className="w-3.5 h-3.5 text-[#C8A95E]" />
                <span className="text-xs font-medium text-[#5A5650]">Launch: 11 Oct 2026</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F4] border border-[#E8E3DB]">
                <FileText className="w-3.5 h-3.5 text-[#8A8580]" />
                <span className="text-xs font-medium text-[#5A5650]">Updated: 17 Sep 2026</span>
              </div>
            </div>
          </div>
        </div>

        <article className="rounded-2xl bg-white border border-[#E8E3DB] shadow-sm px-6 sm:px-10 py-8 sm:py-10">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2 className="text-xl font-heading font-bold text-[#1A1A1A] mt-2 mb-1 first:mt-0 sr-only">{children}</h2>
              ),
              h2: ({ children }) => (
                <h3 className="text-lg font-heading font-semibold text-[#1A1A1A] mt-8 mb-3 pb-2 border-b border-[#E8E3DB]">{children}</h3>
              ),
              h3: ({ children }) => (
                <h4 className="text-base font-heading font-semibold text-[#1A1A1A] mt-6 mb-2 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-logo-gradient mt-2 shrink-0" />
                  {children}
                </h4>
              ),
              p: ({ children }) => <p className="text-[15px] leading-[1.75] text-[#5A5650] mb-4">{children}</p>,
              ul: ({ children }) => <ul className="text-[15px] leading-[1.75] text-[#5A5650] mb-4 ml-1 space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="text-[15px] leading-[1.75] text-[#5A5650] mb-4 ml-1 space-y-2">{children}</ol>,
              li: ({ children }) => (
                <li className="pl-1 flex gap-2.5">
                  <span className="w-1 h-1 rounded-full bg-[#C8A95E] mt-[10px] shrink-0" />
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => <strong className="font-semibold text-[#1A1A1A]">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#5A5650]">{children}</em>,
              hr: () => <hr className="border-[#E8E3DB] my-8" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-[3px] border-[#C8A95E] bg-gradient-to-r from-[#FAF8F4] to-transparent pl-4 pr-3 py-3.5 rounded-r-lg mb-5 text-[15px] text-[#5A5650]">
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a href={href} className="text-[#C8A95E] underline underline-offset-2 hover:opacity-80 font-medium">{children}</a>
              ),
            }}
          >
            {termsOfServiceContent}
          </ReactMarkdown>

          <div className="mt-8 pt-6 border-t border-[#E8E3DB]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="inline-flex items-center gap-2 text-sm text-[#5A5650]">
                <Mail className="w-4 h-4 text-[#C8A95E]" />
                <span>kramashaofficial[at]gmail[dot]com</span>
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-[#5A5650]">
                <MapPin className="w-4 h-4 text-[#C8A95E]" />
                <span>Lad Apartment, Vadodara, Gujarat</span>
              </div>
            </div>
          </div>
        </article>

        <p className="text-center text-xs text-[#8A8580] mt-6">
          By using Kramasha, you acknowledge that you have read and understood these Terms.
        </p>
      </main>
    </div>
  );
}