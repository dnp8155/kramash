// Centralized application configuration.
// All version info and environment config lives here — never hardcode elsewhere.

export const APP_CONFIG = {
  name: "Kramasha",
  shortName: "Kramasha",
  version: "1.0.0",
  phase: "Edited 2026-09-25 20:12 IST",
  versionLabel: "Version 1.0.0 Beta",
  buildDate: "2026-09-25",

  // PWA
  manifestPath: "/manifest.json",
  swPath: "/sw.js",

  // Feature availability (honest states — never fake)
  features: {
    phoneOtp: {
      available: false, // true only when OTP_PROVIDER_API_KEY secret is set
      label: "Phone OTP",
    },
    paymentGateway: {
      available: true, // Razorpay configured
      label: "Online Payment",
      gateway: "razorpay",
    },
    appLock: {
      available: typeof window !== "undefined" && "credentials" in navigator && "PublicKeyCredential" in window,
      label: "App Lock (WebAuthn)",
    },
  },

  // Third-party cost disclaimer
  thirdPartyCostDisclaimer:
    "Payment gateway charges, SMS/OTP charges, and other third-party service costs are not included in the subscription price and are borne separately by the client.",
};

// Helper to get a user-facing version string.
export function getVersionString() {
  return `${APP_CONFIG.version} · ${APP_CONFIG.phase}`;
}