import React from "react";
import { Link } from "react-router-dom";
import AuthProductPanel from "@/components/AuthProductPanel";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
              K
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramashah</span>
          </Link>

          {/* Header */}
          <div className="mb-7">
            {Icon && (
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          {children}

          {/* Footer */}
          {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
        </div>
      </div>

      {/* Right: Product panel — desktop only */}
      <AuthProductPanel />
    </div>
  );
}