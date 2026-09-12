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
  const pillRef = useRef(null);
  const btnRefs = useRef({});
  const activeRef = useRef("features");

  const movePill = (id) => {
    const btn = btnRefs.current[id];
    const pill = pillRef.current;
    if (!btn || !pill) return;
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    pill.style.width = `${btn.offsetWidth}px`;
  };

  // Scrollspy — single rAF-throttled handler, stable rootMargin
  useEffect(() => {
    let raf = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.target.id !== activeRef.current) {
              activeRef.current = entry.target.id;
              setActive(entry.target.id);
            }
          });
        });
      },
      { root: null, rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Position pill on active change
  useEffect(() => {
    movePill(active);
  }, [active]);

  // Reposition on resize + initial
  useEffect(() => {
    const onResize = () => movePill(activeRef.current);
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => movePill(activeRef.current), 60);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  const handleClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    activeRef.current = id;
    setActive(id);
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-card/90 backdrop-blur-xl border border-border rounded-full p-1.5 shadow-2xl grid grid-cols-5 relative w-full">
        {/* Sliding pill — uses transform for GPU-accelerated, stable motion */}
        <div
          ref={pillRef}
          className="absolute top-1.5 bottom-1.5 left-0 bg-[#F58220] rounded-full z-0 pointer-events-none will-change-transform"
          style={{ width: 0, transform: "translateX(0)" }}
        />
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => handleClick(e, t.id)}
              ref={(el) => (btnRefs.current[t.id] = el)}
              className={`relative z-10 py-2.5 rounded-full flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
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