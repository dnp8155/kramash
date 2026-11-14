// Time zones offered in onboarding and Settings. They line up with the currencies the app offers:
// ₹ India, $ New York, AED Dubai (plus UTC). Settings → Profile & Workspace also lists London and Sydney.
export const TIMEZONES_CORE = [
  { v: "Asia/Kolkata", l: "Asia/India" },
  { v: "UTC", l: "UTC" },
  { v: "Asia/Dubai", l: "Asia/Dubai" },
  { v: "America/New_York", l: "America/New_York" },
];
export const TIMEZONES = [
  ...TIMEZONES_CORE,
  { v: "Europe/London", l: "Europe/London" },
  { v: "Australia/Sydney", l: "Australia/Sydney" },
];

// The time zone that goes with each currency (used when a city suggests a currency).
export const CURRENCY_TIMEZONE = { INR: "Asia/Kolkata", USD: "America/New_York", AED: "Asia/Dubai" };
