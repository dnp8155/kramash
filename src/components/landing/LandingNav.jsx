import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#showcase", label: "Showcase" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
            K
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">KRAMAS</span>
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
            className="h-9 px-4 inline-flex items-center justify-center text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="h-9 px-4 inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg shadow-sm transition-all"
          >
            Get started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background">
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
                className="flex-1 h-10 inline-flex items-center justify-center text-sm font-medium border border-border rounded-lg"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 h-10 inline-flex items-center justify-center text-sm font-semibold bg-primary text-primary-foreground rounded-lg"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}