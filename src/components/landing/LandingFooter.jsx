import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Logo size={28} className="shadow-sm" />
              <span className="font-heading text-lg font-semibold text-foreground">Kramasha</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              The all-in-one workspace for service businesses — clients, projects, teams, quotations and finances in one place.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#industries" className="text-muted-foreground hover:text-foreground transition-colors">Industries</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Log in</Link></li>
              <li><Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Sign up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Security</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Built with row-level security and secure cloud database architecture for absolute privacy.
            </p>
            <div className="text-success font-medium flex items-center gap-1.5 text-xs">
              ● Systems Fully Operational
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kramasha. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}