import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Youtube, Linkedin, MessageCircle } from "lucide-react";
import Logo from "@/components/common/Logo";

const SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/" },
      { label: "Pricing", to: "/" },
      { label: "Changelog", to: "/app-updates" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Guides", to: "/help" },
      { label: "Contact", to: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

const SOCIAL = [
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: MessageCircle, label: "WhatsApp" },
];

export default function LandingFooter() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-[#1C1C1C]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={32} />
              <div>
                <div className="font-heading text-base font-bold tracking-tight text-white leading-none">Kramasha</div>
                <div className="text-[10px] text-[#888] leading-none mt-0.5">Built for Creative Businesses</div>
              </div>
            </Link>
            <p className="text-sm text-[#888] leading-relaxed max-w-xs">
              The connected business management platform for photographers, event planners, studios and creative businesses.
            </p>
            <div className="flex gap-3 mt-5">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#888] hover:text-[#C8A95E] hover:border-[#C8A95E]/30 transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">{section.title}</div>
              <div className="space-y-2.5">
                {section.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="block text-sm text-[#888] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#1C1C1C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#888]">© {new Date().getFullYear()} Kramasha. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/terms" className="text-xs text-[#888] hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs text-[#888] hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}