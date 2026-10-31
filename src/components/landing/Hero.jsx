import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import BrowserFrame from "@/components/landing/previews/BrowserFrame";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import { HERO_BUSINESSES } from "@/components/landing/heroDays";
import { useReducedMotion } from "@/lib/motionVariants";

// A hand-drawn call-out: a few words in handwriting and a loose arrow. "down" puts the arrow under the words, pointing
// down; "right" puts it after them, pointing right. The words never wrap, so the arrow always sits where it should.
function Note({ children, className = "", arrow = "down" }) {
  const down = arrow === "down";
  return (
    <div className={`absolute z-20 pointer-events-none select-none text-[#8A6D2B] flex ${down ? "flex-col items-start" : "flex-row items-center gap-1"} ${className}`} aria-hidden="true">
      <span className="block font-['Caveat'] text-[22px] leading-none whitespace-nowrap -rotate-2">{children}</span>
      <svg viewBox="0 0 50 44" className={down ? "w-9 h-8 ml-4" : "w-10 h-8 shrink-0"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={down ? "M24 2 C 30 16, 26 30, 14 40 M10 31 L13 41 L24 38" : "M2 28 C 16 34, 34 30, 46 17 M36 15 L47 16 L43 26"} />
      </svg>
    </div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState(HERO_BUSINESSES[0].id);
  const [picked, setPicked] = useState(false); // once someone chooses, stop cycling on their behalf

  // Until a business is picked, show each one in turn so a visitor sees the range without doing anything.
  useEffect(() => {
    if (picked || reduce) return undefined;
    const timer = setInterval(() => {
      setActiveId((cur) => HERO_BUSINESSES[(HERO_BUSINESSES.findIndex((x) => x.id === cur) + 1) % HERO_BUSINESSES.length].id);
    }, 4500);
    return () => clearInterval(timer);
  }, [picked, reduce]);

  const pick = (id) => { setPicked(true); setActiveId(id); };

  return (
    <section className="relative overflow-hidden bg-[#F5F3EF] pt-10 pb-20 sm:pt-16 sm:pb-28" style={{ backgroundImage: "radial-gradient(rgba(26,26,26,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-10 items-center">
          <div className="flex flex-col items-start">
            <Reveal>
              <h1 className="font-heading text-[2.25rem] sm:text-[3.5rem] lg:text-[clamp(2.6rem,3.7vw,3.7rem)] font-semibold tracking-tight text-[#1A1A1A] leading-[1.06] mb-6">
                <span className="sr-only">Kramasha: business management for photographers, event managers, architects, interior designers, salons, consultants and caterers. </span>
                <span className="block">I run a</span>
                {/* Every business word sits in the same spot and the active one fades in: the heading never changes size or moves. */}
                <span className="grid" aria-live="polite">
                  {HERO_BUSINESSES.map((b) => (
                    <span key={b.id} aria-hidden={b.id !== activeId} className={`col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-500 ${b.id === activeId ? "opacity-100" : "opacity-0"}`}>
                      <span style={{ backgroundImage: "linear-gradient(transparent 62%, rgba(200,169,94,0.45) 62%, rgba(200,169,94,0.45) 92%, transparent 92%)" }}>{b.word}</span>
                    </span>
                  ))}
                </span>
                <span className="block">business.</span>
              </h1>
            </Reveal>

            <Reveal delay={80}>
              <p className="text-base sm:text-lg text-[#5A5650] leading-relaxed mb-6 max-w-md">
                Clients on WhatsApp, payments in Excel, dates in a diary. Kramasha puts bookings, team, quotations, invoices and payments on one page.
              </p>
            </Reveal>

            <Reveal delay={140}>
              <div className="mb-7">
                <div className="font-['Caveat'] text-xl text-[#8A6D2B] mb-1.5 -rotate-1">not you? pick yours</div>
                <div className="flex flex-wrap gap-2">
                  {HERO_BUSINESSES.map((p) => {
                    const on = p.id === activeId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pick(p.id)}
                        aria-pressed={on}
                        className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors duration-200 ${
                          on
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                            : "bg-transparent text-[#1A1A1A] border-dashed border-[#B9B2A6] hover:border-[#1A1A1A]"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Link to="/register" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-colors">
                  Sign up free <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#install" onClick={(e) => { e.preventDefault(); document.getElementById("install")?.scrollIntoView({ behavior: "smooth" }); }} className="install-glow h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-white text-[#1A1A1A] border border-[#C8A95E] rounded-full transition-colors">
                  <Download className="w-4 h-4 text-[#C8A95E]" /> Install as app
                </a>
              </div>
              <p className="text-xs text-[#8A8580]">Free to start. No card needed.</p>
            </Reveal>
          </div>

          {/* The real app: the dashboard on a laptop, and the same dashboard on a phone. */}
          <Reveal delay={160} className="relative">
            <div className="relative mx-auto w-full max-w-[620px] pt-14 pb-20 pr-0 sm:pr-10">
              <BrowserFrame className="!shadow-xl">
                <img
                  src="/landing/dashboard-desktop.webp"
                  alt="The Kramasha dashboard on a laptop: payments, upcoming events, team wages and outstanding dues"
                  width={2400}
                  height={1456}
                  decoding="async"
                  draggable={false}
                  data-shot=""
                  className="block w-full h-auto"
                />
              </BrowserFrame>

              <div className="absolute -bottom-2 right-0 sm:-right-0 origin-bottom-right scale-[0.62] sm:scale-[0.78]">
                <MobilePreview shot="/landing/dashboard-phone.webp" shotAlt="The Kramasha dashboard on a phone" shotTop="mt-[30px]" />
              </div>

              <Note arrow="down" className="hidden sm:flex top-1 left-8">your whole business, at a glance</Note>
              <Note arrow="right" className="hidden sm:flex bottom-3 left-[18%]">same app, on your phone</Note>
              <p className="sm:hidden absolute bottom-3 left-1 font-['Caveat'] text-xl text-[#8A6D2B] -rotate-2 leading-none whitespace-nowrap">same app, on your phone →</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
