import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-[#FAF8F4]/90 backdrop-blur-xl border-b border-[#E8E3DB]" : "bg-transparent"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={32} />
          <div className="block">
            <div className="font-heading text-base font-bold tracking-tight text-[#1A1A1A] leading-none">Kramasha</div>
            <div className="text-[10px] text-[#8A8580] leading-none mt-0.5">Built for Creative Businesses</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="h-9 px-3 sm:px-4 inline-flex items-center justify-center text-sm font-medium text-[#1A1A1A] hover:text-[#C8A95E] rounded-full transition-colors">
            Login
          </Link>
          <Link to="/register" className="h-9 px-4 sm:px-5 inline-flex items-center justify-center text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-all">
            SignUp
          </Link>
        </div>
      </div>
    </header>
  );
}