// Centralized application configuration.
// All version, branding, and PWA metadata lives here — never hardcode these
// values in individual components.

export const APP_CONFIG = {
  name: "Kramashah",
  shortName: "Kramashah",
  version: "2.0.0",
  versionLabel: "2.0.0 Multi-Industry Beta",
  releaseDate: "Sep 2026",
  description: "Kramashah helps service businesses manage clients, projects/events, teams, services, quotations and finances from one workspace.",
  themeColor: "#4f46e5",
  backgroundColor: "#ffffff",
  // Production URL is resolved at runtime from window.location.origin.
  // Do not hardcode development URLs.
  get appUrl() {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  },
};

// Changelog entries — centralized so App & Updates always shows current data.
export const CHANGELOG = [
  { version: "2.0.0", date: "Sep 2026", tag: "Feature", title: "Multi-Industry Support", notes: "Dynamic terminology for Photography, Event Management, Architecture, and Other service businesses. Industry-specific preset seeding, category-aware onboarding, and full backward compatibility with existing workspaces." },
  { version: "1.5.0", date: "Sep 2026", tag: "Feature", title: "PWA, Payments & Exports", notes: "Installable web app, subscription checkout, Excel/CSV exports, and in-app notifications." },
  { version: "1.4.0", date: "Sep 2026", tag: "Feature", title: "Rate Estimator with GST", notes: "Build estimates with optional 18% GST and line-item discounts." },
  { version: "1.3.2", date: "Aug 2026", tag: "Improvement", title: "Faster event loading", notes: "Optimized event list rendering for large workspaces." },
  { version: "1.3.0", date: "Aug 2026", tag: "Feature", title: "Team invitations", notes: "Invite crew members by email with role-based access." },
  { version: "1.2.5", date: "Jul 2026", tag: "Fix", title: "Payment export fix", notes: "Resolved currency formatting in exported reports." },
];

export const TAG_STYLES = {
  Feature: "bg-primary/10 text-primary",
  Improvement: "bg-info/10 text-info",
  Fix: "bg-warning/10 text-warning",
};