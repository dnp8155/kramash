import React, { useEffect, useState } from "react";
import { Home, Sparkles, Workflow, Building2, Tag, HelpCircle } from "lucide-react";

const NAV = [
  { label: "Home", id: "home", icon: Home },
  { label: "Features", id: "features", icon: Sparkles },
  { label: "How It Works", id: "how-it-works", icon: Workflow },
  { label: "Industries", id: "industries", icon: Building2 },
  { label: "Pricing", id: "pricing", icon: Tag },
  { label: "FAQ", id: "faq", icon: HelpCircle },
];

export default function LandingBottomNav() {
  const [active, setActive] = useState("home");
  const [atFooter, setAtFooter] = useState(false);

  // Scrollspy — highlight whichever section is crossing the center band of the viewport.
  useEffect(() => {
    const sections = NAV.filter((n) => n.id !== "home")
      .map((n) => document.getElementById(n.id))
      .filter(Boolean);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Treat "at the very top" as the Home item being active.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 80) setActive("home");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide the floating bar only once we've scrolled past the closing CTA ("Stop Managing Your
  // Business...") and reached the footer beneath it — not while the CTA itself is still in view.
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAtFooter(entry.isIntersecting),
      { rootMargin: "0px", threshold: 0 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1 transition-all duration-300 ${
        atFooter ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
    >
      <div className="max-w-lg mx-auto flex items-stretch gap-0.5 bg-black/70 backdrop-blur-xl border border-white/15 rounded-full p-1 shadow-lg shadow-black/30">
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <a
              key={n.id}
              href={n.id === "home" ? "#" : `#${n.id}`}
              onClick={(e) => scrollTo(e, n.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-full transition-colors min-w-0 ${
                isActive ? "text-white" : "text-white/50 hover:text-white/85"
              }`}
            >
              {isActive && <span className="absolute inset-0 rounded-full bg-white/10" />}
              <Icon className="relative w-[18px] h-[18px] shrink-0" />
              <span className="relative text-[10px] font-semibold leading-[1.3] truncate w-full text-center pb-px">{n.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
