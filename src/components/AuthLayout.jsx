import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-hover" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-sidebar-foreground w-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center text-sidebar-primary-foreground font-bold text-xl shadow-lg">
              K
            </div>
            <div>
              <div className="font-heading text-lg font-bold tracking-tight">KRAMAS</div>
              <div className="text-xs text-sidebar-muted">Event Management Suite</div>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-md">
            <h2 className="font-heading text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Manage events like a pro.
            </h2>
            <p className="mt-4 text-sidebar-muted text-base leading-relaxed">
              Bookings, quotations, team assignments, payments & financials — all in one refined workspace built for photographers and production teams.
            </p>

            {/* Feature bullets */}
            <div className="mt-10 space-y-4">
              {[
                "Smart quotation & GST billing",
                "Team availability calendar",
                "Real-time payment tracking",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-sidebar-primary" />
                  </div>
                  <span className="text-sm text-sidebar-foreground/90">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-sidebar-muted/70">
            © {new Date().getFullYear()} KRAMAS. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shadow-md">
              K
            </div>
            <div>
              <div className="font-heading text-lg font-bold tracking-tight text-foreground">KRAMAS</div>
              <div className="text-xs text-muted-foreground">Event Management Suite</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6 sm:p-8">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}