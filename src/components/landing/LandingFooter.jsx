import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, PartyPopper, Building2, Sofa, Scissors, Briefcase, Megaphone, UtensilsCrossed, HardHat, Compass } from "lucide-react";
import { useReducedMotion } from "@/lib/motionVariants";
import Logo from "@/components/common/Logo";

// Every business type the app supports (same list as onboarding) — the corner icon plays through them.
const CATEGORIES = [
  { icon: Camera, label: "Photography" },
  { icon: PartyPopper, label: "Event Management" },
  { icon: Building2, label: "Architecture" },
  { icon: Sofa, label: "Interior Design" },
  { icon: Scissors, label: "Salon & Beauty" },
  { icon: Briefcase, label: "Consulting" },
  { icon: Megaphone, label: "Agencies" },
  { icon: UtensilsCrossed, label: "Catering" },
  { icon: HardHat, label: "Contracting" },
  { icon: Compass, label: "And more" },
];

const SECTIONS = [
  {
    title: "Resources",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Sign In", to: "/login" },
      { label: "Create Account", to: "/register" },
    ],
  },
];

// A large, faint icon tucked in a corner that cross-fades through every category on its own.
// Two of them (left + right on desktop) start on different categories and tick out of step,
// so the pair never shows the same icon or changes at the same moment.
function CategoryIconLoop({ start = 0, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(start);
  useEffect(() => {
    if (reduce) return;
    let id;
    const kickoff = setTimeout(() => {
      id = setInterval(() => setIdx((i) => (i + 1) % CATEGORIES.length), 3200);
    }, delay);
    return () => { clearTimeout(kickoff); clearInterval(id); };
  }, [reduce, delay]);
  return (
    <div aria-hidden="true" className={"pointer-events-none absolute text-[#C8A95E] " + className}>
      {CATEGORIES.map(({ icon: Icon, label }, i) => (
        <Icon
          key={label}
          strokeWidth={0.4}
          className={"absolute inset-0 w-full h-full transition-all duration-[1400ms] ease-in-out " + (i === idx ? "opacity-[0.16] scale-100 rotate-0" : "opacity-0 scale-90 -rotate-6")}
        />
      ))}
    </div>
  );
}

export default function LandingFooter() {
  return (
    <footer id="site-footer" className="relative overflow-hidden bg-[#0A0A0A]">
      {/* Gold hairline instead of a plain border */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A95E]/50 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14">
        {/* Phones: Resources / Company stack on the left, so the icon fills the empty space beside them.
            Desktop: the link columns sit close to the brand on the left; the icon takes the free space on the right. */}
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,22rem)_auto_auto] lg:justify-start lg:gap-x-8 lg:items-start">
          <CategoryIconLoop className="z-0 right-0 bottom-0 w-[10.5rem] h-[10.5rem] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:-right-4 lg:w-[17rem] lg:h-[17rem]" />
          <div className="relative z-10 lg:mr-16">
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
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title} className="relative z-10">
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