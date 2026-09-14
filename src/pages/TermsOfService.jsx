import React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { termsOfServiceContent } from "@/lib/legalContent";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors mb-6">
          <span className="w-8 h-8 rounded-full border border-[#E8E3DB] bg-[#FAF8F4] flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back to home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/5 text-[#1A1A1A] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#1A1A1A]">Terms of Service</h1>
        </div>
        <p className="text-sm text-[#8A8580] mb-8">
          Kramashah — Event &amp; Production Management Platform
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
              hr: () => <hr className="border-[#E8E3DB] my-6" />,
              a: ({ children, href }) => <a href={href} className="text-[#C8A95E] underline underline-offset-2 hover:opacity-80">{children}</a>,
            }}
          >
            {termsOfServiceContent}
          </ReactMarkdown>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}