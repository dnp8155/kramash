import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header keeps one fixed height, so the page never shifts. Only the bar inside it changes:
  // it narrows, rounds into a pill and picks up a frosted background + soft shadow as you scroll.
  return (
    <header
      className={`sticky top-0 z-50 w-full pt-[env(safe-area-inset-top)] pointer-events-none transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? "px-3 sm:px-4" : "px-0"}`}
    >
      <div className="h-16 flex items-center">
        <div
          className={`pointer-events-auto mx-auto w-full flex items-center justify-between border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled
              ? "max-w-[760px] h-[52px] rounded-full px-3 sm:px-4 bg-[#FAF8F4]/80 backdrop-blur-xl border-[#E8E3DB] shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_-1px_0_rgba(15,23,42,0.04)]"
              : "max-w-6xl h-16 rounded-none px-4 sm:px-6 bg-transparent border-transparent shadow-none"
          }`}
        >
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Logo size={scrolled ? 28 : 32} className="transition-all duration-500" />
            <div className="min-w-0">
              <div className="font-heading text-base font-bold tracking-tight text-[#1A1A1A] leading-none">Kramasha</div>
              <div
                className={`text-[10px] text-[#8A8580] leading-none truncate transition-all duration-500 ${
                  scrolled ? "max-h-0 opacity-0 mt-0 sm:max-h-3 sm:opacity-100 sm:mt-0.5" : "max-h-3 opacity-100 mt-0.5"
                }`}
              >
                Built for Creative Businesses
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/login" className="h-9 px-3 sm:px-4 inline-flex items-center justify-center text-sm font-medium text-[#1A1A1A] hover:text-[#C8A95E] rounded-full transition-colors">
              Login
            </Link>
            <Link to="/register" className="h-9 px-4 sm:px-5 inline-flex items-center justify-center text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-all">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
