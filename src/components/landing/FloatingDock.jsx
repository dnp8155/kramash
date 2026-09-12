import React, { useEffect, useRef, useState } from "react";
import { Layers, Compass, GitBranch, Tag, HelpCircle } from "lucide-react";

const TABS = [
  { id: "features", label: "Features", icon: Layers },
  { id: "industries", label: "Industries", icon: Compass },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "pricing", label: "Pricing", icon: Tag },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export default function FloatingDock() {
  const [active, setActive] = useState("features");
  const [scrolledDown, setScrolledDown] = useState(false);
  const pillRef = useRef(null);
  const btnRefs = useRef({});
  const lastScrollY = useRef(0);

  // Move the sliding pill to the active tab
  const movePill = (id) => {
    const btn = btnRefs.current[id];
    const pill = pillRef.current;
    if (!btn || !pill) return;
    pill.style.left = `${btn.offsetLeft}px`;
    pill.style.width = `${btn.offsetWidth}px`;
  };

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { root: null, rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Position pill whenever active changes
  useEffect(() => {
    movePill(active);
  }, [active]);

  // Reposition on resize
  useEffect(() => {
    const onResize = () => movePill(active);
    window.addEventListener("resize", onResize);
    // Initial position after mount
    setTimeout(() => movePill(active), 50);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  // Shrink dock slightly when scrolling down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 50 && y > lastScrollY.current) {
        setScrolledDown(true);
      } else {
        setScrolledDown(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setActive(id);
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto bg-card/80 backdrop-blur-xl border border-border rounded-full p-1.5 shadow-2xl grid grid-cols-5 relative transition-all duration-300 w-full ${
          scrolledDown ? "scale-90 translate-y-1.5" : "scale-100 translate-y-0"
        }`}
      >
        {/* Sliding pill */}
        <div
          ref={pillRef}
          className="absolute top-1.5 bottom-1.5 bg-primary rounded-full shadow-md z-0 pointer-events-none transition-all duration-300"
          style={{ left: 0, width: 0 }}
        />
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => handleClick(e, t.id)}
              ref={(el) => (btnRefs.current[t.id] = el)}
              className={`relative z-10 py-2.5 rounded-full flex flex-col items-center justify-center gap-1 transition-colors duration-300 ${
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold leading-none">{t.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}