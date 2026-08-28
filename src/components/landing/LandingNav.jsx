import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: "Product" },
    { href: "#industries", label: "Industries" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
            K
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramashah</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="nav_login h-9 px-4 inline-flex items-center justify-center text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="nav_start_free h-9 px-4 inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg shadow-sm transition-all"
          >
            Start Free
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-border flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 h-11 inline-flex items-center justify-center text-sm font-medium border border-border rounded-lg"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 h-11 inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground rounded-lg"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}