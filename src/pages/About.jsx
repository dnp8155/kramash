import React from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { aboutContent } from "@/lib/legalContent";
import useSEO from "@/hooks/useSEO";

export default function About() {
  const navigate = useNavigate();

  useSEO({
    title: "About Kramasha — Creative Business Management Platform for India",
    description: "Learn about Kramasha, the all-in-one business management platform built for photographers, event managers, studios and creative businesses in India. Manage clients, projects, teams, quotations, invoices and finances from one dashboard.",
    keywords: "about Kramasha, creative business management platform India, photography business software India, event management software Gujarat, studio management platform, photographer CRM, business management app for photographers, wedding photography software India",
    path: "/about",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Kramasha",
      description: "Kramasha is a creative business management platform built for photographers, event managers, studios and creative businesses in India.",
      url: "https://kramasha.com/about",
      publisher: { "@type": "Organization", name: "Kramasha", url: "https://kramasha.com" },
    },
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "About", url: "/about" },
    ],
  });
  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors mb-6">
          <span className="w-8 h-8 rounded-full border border-[#E8E3DB] bg-[#FAF8F4] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/5 text-[#1A1A1A] flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#1A1A1A]">About Us</h1>
        </div>
        <p className="text-sm text-[#8A8580] mb-8">
          Kramasha — Creative Business Management Platform
        </p>

        <article className="prose-legal">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="text-xl font-heading font-bold text-[#1A1A1A] mt-10 mb-3 first:mt-0">{children}</h2>,
              h2: ({ children }) => <h3 className="text-lg font-heading font-semibold text-[#1A1A1A] mt-8 mb-2">{children}</h3>,
              h3: ({ children }) => <h4 className="text-base font-heading font-semibold text-[#1A1A1A] mt-6 mb-2">{children}</h4>,
              p: ({ children }) => <p className="text-sm leading-relaxed text-[#5A5650] mb-4">{children}</p>,
              ul: ({ children }) => <ul className="text-sm leading-relaxed text-[#5A5650] mb-4 ml-5 list-disc space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="text-sm leading-relaxed text-[#5A5650] mb-4 ml-5 list-decimal space-y-1.5">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-[#1A1A1A]">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#5A5650]">{children}</em>,
              hr: () => <hr className="border-[#E8E3DB] my-6" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[#C8A95E] bg-[#FAF8F4] rounded-r-lg pl-4 pr-4 py-3 my-4 text-sm italic text-[#5A5650]">
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => <a href={href} className="text-[#C8A95E] underline underline-offset-2 hover:opacity-80">{children}</a>,
            }}
          >
            {aboutContent}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}