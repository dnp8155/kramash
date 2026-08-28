import React from "react";
import { Link } from "react-router-dom";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
              K
            </div>
            <span className="font-heading text-sm font-bold text-foreground">KRAMAS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Log in</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Sign up</Link>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} KRAMAS</p>
        </div>
      </div>
    </footer>
  );
}