import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { contactContent } from "@/lib/legalContent";
import useSEO from "@/hooks/useSEO";
import Logo from "@/components/common/Logo";

// Only revealed on tap, so the number is not sitting in the page text for scrapers and spam lists.
const PHONE_DIGITS = ["88498", "85091"].join("");

export default function Contact() {
  const navigate = useNavigate();
  const [phoneShown, setPhoneShown] = useState(false);

  useSEO({
    title: "Contact Kramasha — Support for Your Creative Business App",
    description: "Contact the Kramasha team by email for help with your account, billing or data requests. We reply within 1–2 business days.",
    keywords: "contact Kramasha, Kramasha support, Kramasha help email",
    path: "/contact",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Kramasha",
      url: "https://www.kramasha.com/contact",
      publisher: { "@type": "Organization", name: "Kramasha", url: "https://www.kramasha.com", email: "kramashaofficial@gmail.com" },
    },
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Contact", url: "/contact" },
    ],
  });
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
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#1A1A1A]">Contact Us</h1>
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
              a: ({ children, href }) => <a href={href} className="font-medium text-[#1A1A1A] underline decoration-[#C8A95E] decoration-2 underline-offset-[3px] hover:decoration-[#1A1A1A] transition-colors">{children}</a>,
            }}
          >
            {contactContent}
          </ReactMarkdown>
        </article>

        <section className="mt-2 rounded-xl border border-[#E8E3DB] bg-[#FAF8F4] p-4">
          <h2 className="text-base font-heading font-semibold text-[#1A1A1A] mb-1 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</h2>
          <p className="text-sm leading-relaxed text-[#5A5650] mb-3">
            For payment problems only. For everything else, email is faster and we keep a written record of it.
          </p>
          {phoneShown ? (
            <a href={`tel:+91${PHONE_DIGITS}`} className="text-sm font-medium text-[#1A1A1A] underline decoration-[#C8A95E] decoration-2 underline-offset-[3px]">+91 {PHONE_DIGITS.slice(0, 5)} {PHONE_DIGITS.slice(5)}</a>
          ) : (
            <button type="button" onClick={() => setPhoneShown(true)} className="text-sm font-medium text-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#E8E3DB] bg-white hover:bg-[#F5F3EF] transition-colors">
              Show phone number
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
