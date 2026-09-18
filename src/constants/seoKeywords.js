/**
 * SEO Keywords — Centralized repository of all SEO keywords used across Kramasha.
 * 
 * This file is the single source of truth for SEO keywords. Each page imports
 * from here so keywords stay consistent and easy to update.
 * 
 * Organized by:
 *   1. Page-specific keyword sets (used by useSEO hook)
 *   2. Master keyword bank (all keywords combined)
 *   3. Industry-specific keyword clusters
 *   4. Location-targeted keywords (Gujarat / India)
 */

// ============================================================
// 1. PAGE-SPECIFIC KEYWORD SETS
// ============================================================

export const LANDING_KEYWORDS = [
  // Primary — software/platform terms
  "photography business management software India",
  "photography CRM Gujarat",
  "event management software India",
  "studio management software",
  "photographer invoicing",
  "photography quotation software",
  "wedding photography business management",
  "event planner software Gujarat",
  "creative business management platform India",
  "photography client portal",
  "team management software photographers",
  "payment tracking software",
  "milestone billing software",
  "GST invoicing software India",
  "freelance business management",
  "architecture project management",
  "interior design business software",
  "business management app for photographers",
  // Secondary — feature terms
  "lead management software",
  "client management CRM",
  "project management creative business",
  "job sheet software",
  "financial year management",
  "expense tracking software",
  "invoice generator India",
  "quotation builder software",
  "team scheduling software",
  "availability calendar software",
  // Tertiary — brand/identity
  "Kramasha",
  "Kramasha app",
  "Kramasha software",
  "Kramasha platform",
];

export const ABOUT_KEYWORDS = [
  "about Kramasha",
  "creative business management platform India",
  "photography business software India",
  "event management software Gujarat",
  "studio management platform",
  "photographer CRM",
  "business management app for photographers",
  "wedding photography software India",
  "creative entrepreneur tools India",
  "SaaS for creative businesses India",
];

export const FAQ_KEYWORDS = [
  "Kramasha FAQ",
  "photography business software FAQ",
  "event management software India",
  "photography CRM pricing",
  "GST billing software",
  "client portal FAQ",
  "team management software",
  "milestone payment tracking",
  "creative business platform India",
  "photography studio software FAQ",
];

export const TERMS_KEYWORDS = [
  "Kramasha terms of service",
  "business management software terms",
  "photography software terms India",
  "event management platform terms",
  "SaaS terms India",
  "creative business software terms",
];

export const PRIVACY_KEYWORDS = [
  "Kramasha privacy policy",
  "business management software privacy",
  "photography software privacy India",
  "event management platform privacy",
  "SaaS privacy policy India",
  "data protection software India",
  "creative business data privacy",
];

export const PUBLIC_PROFILE_KEYWORDS = [
  "creative business profile India",
  "photography studio profile",
  "event management company profile",
  "creative business directory India",
  "photographer portfolio India",
  "studio directory Gujarat",
];

// ============================================================
// 2. INDUSTRY-SPECIFIC KEYWORD CLUSTERS
// ============================================================

export const INDUSTRY_KEYWORDS = {
  PHOTOGRAPHY: [
    "photography business management",
    "photography studio software",
    "wedding photography CRM",
    "photographer invoicing software",
    "photography quotation builder",
    "photography client portal",
    "photo shoot management",
    "photography team scheduling",
    "photography payment tracking",
    "photography milestone billing",
  ],
  EVENT_MANAGEMENT: [
    "event management software India",
    "event planner CRM",
    "event management platform Gujarat",
    "wedding planner software",
    "event coordination software",
    "event quotation software",
    "event team management",
    "event payment tracking",
    "event job sheet software",
    "event client portal",
  ],
  ARCHITECTURE: [
    "architecture project management software",
    "architect business management",
    "architecture quotation software",
    "architecture client management",
    "architecture project tracking",
    "architecture invoicing software",
  ],
  INTERIOR: [
    "interior design business software",
    "interior design project management",
    "interior design quotation software",
    "interior design CRM",
    "interior design invoicing",
  ],
  SALON_BEAUTY: [
    "salon management software",
    "beauty business management",
    "salon appointment software",
    "salon CRM India",
    "beauty service management",
  ],
  CONSULTING: [
    "consulting business management software",
    "consultant CRM India",
    "consulting invoicing software",
    "consultancy management platform",
  ],
  AGENCY: [
    "agency management software",
    "creative agency CRM",
    "agency project management",
    "agency invoicing software",
  ],
  CATERING: [
    "catering business management software",
    "catering quotation software",
    "catering CRM India",
    "catering event management",
  ],
  CONTRACTING: [
    "contracting business management software",
    "contractor CRM India",
    "contractor quotation software",
    "construction business management",
  ],
};

// ============================================================
// 3. LOCATION-TARGETED KEYWORDS (Gujarat / India)
// ============================================================

export const LOCATION_KEYWORDS = {
  INDIA: [
    "business management software India",
    "photography CRM India",
    "event management software India",
    "creative business platform India",
    "SaaS India",
    "GST invoicing software India",
    "invoice generator India",
  ],
  GUJARAT: [
    "business management software Gujarat",
    "photography software Gujarat",
    "event management software Gujarat",
    "photographer CRM Ahmedabad",
    "wedding photography software Ahmedabad",
    "event planner software Surat",
    "studio management software Vadodara",
    "creative business software Rajkot",
  ],
  CITIES: [
    "business management software Ahmedabad",
    "photography CRM Ahmedabad",
    "event management software Surat",
    "photography studio software Vadodara",
    "wedding photography management Rajkot",
    "creative business platform Gandhinagar",
  ],
};

// ============================================================
// 4. FEATURE-SPECIFIC KEYWORD CLUSTERS
// ============================================================

export const FEATURE_KEYWORDS = {
  CRM: [
    "lead management software",
    "client management CRM",
    "CRM for photographers",
    "CRM for event planners",
    "lead tracking software",
    "client database software",
  ],
  QUOTATIONS: [
    "quotation builder software",
    "photography quotation software",
    "event quotation software",
    "quotation generator India",
    "quotation template software",
    "online quotation software",
  ],
  INVOICING: [
    "invoice generator India",
    "GST invoicing software India",
    "photographer invoicing software",
    "invoice template software",
    "online invoice generator",
    "GST invoice software",
  ],
  PAYMENTS: [
    "payment tracking software",
    "milestone billing software",
    "payment reminder software",
    "advance payment tracking",
    "installment tracking software",
  ],
  TEAM: [
    "team management software",
    "team scheduling software",
    "crew management software",
    "team availability calendar",
    "team assignment software",
    "freelancer management software",
  ],
  FINANCE: [
    "financial year management",
    "expense tracking software",
    "business finance management",
    "revenue tracking software",
    "profit tracking software",
    "financial reporting software",
  ],
  PORTALS: [
    "client portal software",
    "client project portal",
    "team member portal",
    "public job sheet",
    "client tracking portal",
    "secure client access",
  ],
  JOB_SHEET: [
    "job sheet software",
    "crew job sheet",
    "event execution software",
    "shoot day planning software",
    "crew briefing software",
  ],
  CALENDAR: [
    "availability calendar software",
    "booking calendar software",
    "event calendar management",
    "team availability management",
    "shoot scheduling software",
  ],
};

// ============================================================
// 5. MASTER KEYWORD BANK — all keywords combined
// ============================================================

export const ALL_KEYWORDS = [
  ...LANDING_KEYWORDS,
  ...ABOUT_KEYWORDS,
  ...FAQ_KEYWORDS,
  ...TERMS_KEYWORDS,
  ...PRIVACY_KEYWORDS,
  ...PUBLIC_PROFILE_KEYWORDS,
  ...Object.values(INDUSTRY_KEYWORDS).flat(),
  ...Object.values(LOCATION_KEYWORDS).flat(),
  ...LOCATION_KEYWORDS.CITIES,
  ...Object.values(FEATURE_KEYWORDS).flat(),
];

// Deduplicated master list
export const MASTER_KEYWORD_LIST = [...new Set(ALL_KEYWORDS)];

// ============================================================
// 6. HELPER — get keywords for a specific page
// ============================================================

export function getKeywordsForPage(page) {
  const pageMap = {
    landing: LANDING_KEYWORDS,
    about: ABOUT_KEYWORDS,
    faq: FAQ_KEYWORDS,
    terms: TERMS_KEYWORDS,
    privacy: PRIVACY_KEYWORDS,
    publicProfile: PUBLIC_PROFILE_KEYWORDS,
  };
  return (pageMap[page] || LANDING_KEYWORDS).join(", ");
}

export function getIndustryKeywords(industry) {
  return (INDUSTRY_KEYWORDS[industry] || []).join(", ");
}

export function getFeatureKeywords(feature) {
  return (FEATURE_KEYWORDS[feature] || []).join(", ");
}