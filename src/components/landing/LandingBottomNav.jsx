import React, { useEffect, useRef, useState } from "react";
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
  const [entered, setEntered] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const pillRef = useRef(null);

  // Slide up into position on first load instead of just appearing.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Sample whatever section is rendered directly behind the pill as the page
  // scrolls, and invert the pill's colors against it (dark section → white
  // pill, light section → black pill) so it always stays readable.
  useEffect(() => {
    let raf = null;
    const sample = () => {
      raf = null;
      const pill = pillRef.current;
      if (!pill) return;
      const rect = pill.getBoundingClientRect();
      const x = window.innerWidth / 2;
      const y = Math.max(0, rect.top - 8);
      const stack = document.elementsFromPoint(x, y) || [];
      const behind = stack.find((el) => !pill.contains(el));
      let node = behind || null;
      let bg = null;
      while (node && node !== document.body) {
        const c = window.getComputedStyle(node).backgroundColor;
        if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") { bg = c; break; }
        node = node.parentElement;
      }
      if (!bg) return;
      const m = bg.match(/\d+/g);
      if (!m) return;
      const [r, g, b] = m.map(Number);
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      setOnDark(luminance < 100);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(sample);
    };
    sample();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  // Hide the floating bar only once we've scrolled past the closing CTA ("You bring the vision…"
  // headline) and reached the footer beneath it — not while the CTA itself is still in view.
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
      className={`fixed bottom-0 inset-x-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1 transition-all duration-500 ease-out ${
        !entered ? "opacity-0 translate-y-full"
          : atFooter ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
    >
      <div
        ref={pillRef}
        className={`max-w-lg mx-auto flex items-stretch gap-0.5 backdrop-blur-xl border rounded-full p-1 shadow-lg transition-colors duration-300 ${
          onDark ? "bg-white/85 border-black/10 shadow-black/10" : "bg-black/70 border-white/15 shadow-black/30"
        }`}
      >
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <a
              key={n.id}
              href={n.id === "home" ? "#" : `#${n.id}`}
              onClick={(e) => scrollTo(e, n.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-full transition-colors min-w-0 ${
                isActive
                  ? (onDark ? "text-black" : "text-white")
                  : (onDark ? "text-black/50 hover:text-black/85" : "text-white/50 hover:text-white/85")
              }`}
            >
              {isActive && <span className={`absolute inset-0 rounded-full ${onDark ? "bg-black/10" : "bg-white/10"}`} />}
              <Icon className="relative w-[18px] h-[18px] shrink-0" />
              <span className="relative text-[10px] font-semibold leading-[1.3] truncate w-full text-center pb-px">{n.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
