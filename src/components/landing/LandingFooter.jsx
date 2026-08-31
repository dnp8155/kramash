import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={32} className="shadow-sm" />
              <span className="font-heading text-sm font-bold text-foreground">Kramashah</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              The all-in-one workspace for service businesses — clients, projects, teams, quotations and finances in one place.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Industries</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">Photography</li>
              <li className="text-muted-foreground">Event Management</li>
              <li className="text-muted-foreground">Architecture</li>
              <li className="text-muted-foreground">Other Service Businesses</li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Log in</Link></li>
              <li><Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Sign up</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kramashah. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <p className="text-xs text-muted-foreground">Built for service businesses in India</p>
          </div>
        </div>
      </div>
    </footer>
  );
}