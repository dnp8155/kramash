import React from "react";
import { Link } from "react-router-dom";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
            K
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramashah</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#showcase" className="hover:text-foreground transition-colors">Showcase</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="h-9 px-4 inline-flex items-center justify-center text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="h-9 px-4 inline-flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover rounded-md shadow-sm transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}