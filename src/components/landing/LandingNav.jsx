import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "@/components/common/Logo";

const NAV = [
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Industries", id: "industries" },
  { label: "Pricing", id: "pricing" },
  { label: "Resources", id: "faq" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-[#FAF8F4]/90 backdrop-blur-xl border-b border-[#E8E3DB]" : "bg-transparent"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={32} />
          <div className="hidden sm:block">
            <div className="font-heading text-base font-bold tracking-tight text-[#1A1A1A] leading-none">Kramashah</div>
            <div className="text-[10px] text-[#8A8580] leading-none mt-0.5">Built for Creative Businesses</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => scrollTo(e, n.id)} className="text-sm font-medium text-[#1A1A1A] hover:text-[#C8A95E] transition-colors">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/login" className="h-9 px-4 inline-flex items-center justify-center text-sm font-medium text-[#1A1A1A] hover:text-[#C8A95E] rounded-full transition-colors">
            Login
          </Link>
          <Link to="/register" className="h-9 px-5 inline-flex items-center justify-center text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-all">
            Start Free
          </Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden w-9 h-9 flex items-center justify-center text-[#1A1A1A]">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-[#FAF8F4] border-b border-[#E8E3DB] px-4 py-4 space-y-1">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => scrollTo(e, n.id)} className="block py-2.5 text-sm font-medium text-[#1A1A1A] hover:text-[#C8A95E]">
              {n.label}
            </a>
          ))}
          <div className="flex gap-3 pt-3 border-t border-[#E8E3DB]">
            <Link to="/login" className="flex-1 h-10 inline-flex items-center justify-center text-sm font-medium border border-[#E8E3DB] text-[#1A1A1A] rounded-full">Login</Link>
            <Link to="/register" className="flex-1 h-10 inline-flex items-center justify-center text-sm font-semibold bg-[#1A1A1A] text-white rounded-full">Start Free</Link>
          </div>
        </div>
      )}
    </header>
  );
}