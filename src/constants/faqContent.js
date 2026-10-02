// Single source for FAQ content — used by the /faq page (everything, grouped) and the
// landing page (only entries with `home: true`, plus a "Read more FAQs" link).
//
// Keep answers in step with the app: plan limits/prices come from the Your Plan page
// and supabase/migrations/0028_plan_limits_and_pricing.sql; update both together.

export const FAQ_CATEGORIES = [
  { key: "start", label: "Getting started" },
  { key: "plans", label: "Plans & pricing" },
  { key: "features", label: "Features" },
  { key: "security", label: "Data & security" },
  { key: "account", label: "Account & support" },
];

export const faqContent = [
  // ---------------------------------------------------------------- Getting started
  {
    category: "start",
    home: true,
    q: "What is Kramasha?",
    a: "Kramasha is a business management app for photographers, event managers, architects, interior designers, salons, consultants, agencies, caterers, contractors and other service businesses. Clients, events or projects, team, leads, quotations, invoices, payments and finances all live in one place — instead of spreadsheets and scattered chats.",
  },
  {
    category: "start",
    home: true,
    q: "Who is Kramasha built for?",
    a: "Anyone running jobs with a team and money moving around them — event planners, photography and videography studios, architects and interior teams, salons, consultants, agencies, caterers, contractors, and freelancers like decorators, makeup artists, editors and drone operators.",
  },
  {
    category: "start",
    q: "Will it fit my type of business?",
    a: "Yes. When you set up your workspace you pick a business type (Photography, Event Management, Architecture, Interior, Salon & Beauty, Consulting, Agency, Catering, Contracting or Other). Kramasha then pre-fills matching team roles, services, expense categories and wording — for example \"Project\" instead of \"Event\" — so you're not starting from a blank screen. You can add, edit or remove any of it.",
  },
  {
    category: "start",
    q: "Is it hard to set up?",
    a: "No. First-time setup takes a few minutes: pick your business type, enter your business details, location and (optionally) GST, and you're in. Your phone number and email are checked as you type, so mistakes are caught early.",
  },
  {
    category: "start",
    home: true,
    q: "Does it work on my phone?",
    a: "Yes. Kramasha is a responsive web app you can use in any browser and install on your phone or desktop like a native app (Android, iPhone and desktop). It has a mobile-first layout with a bottom navigation bar, and shows a clear \"You're offline\" banner if your connection drops.",
  },

  // ---------------------------------------------------------------- Plans & pricing
  {
    category: "plans",
    home: true,
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes up to 5 events or projects, 3 team members, 5 services and 50 leads, with unlimited quotation and invoice creation, in-app reminders, your public profile page, App Lock and data export from Preferences. It's free to use for as long as you like.",
  },
  {
    category: "plans",
    home: true,
    q: "What does Pro add?",
    a: "Pro removes the limits — unlimited events, projects, services and leads, and up to 50 team members — and unlocks link sharing for quotations, invoices and job sheets, the Client Portal and Team Portal, push notifications, Excel/CSV exports, the Night and Pastel themes, event display controls (show or hide team and services, logo on shared receipts) and your logo on quotations.",
  },
  {
    category: "plans",
    home: true,
    q: "How much does Pro cost?",
    a: "₹219 for 1 month, ₹1,099 for 6 months (about ₹183 a month, roughly 16% less), or ₹1,999 for 12 months (about ₹167 a month, roughly 24% less — our most popular and best-value option). Each is a single payment for that period of Pro access; nothing renews automatically, so you stay in control.",
  },
  {
    category: "plans",
    q: "How do I upgrade and pay?",
    a: "Open Your Plan (in the menu), choose Monthly, 6 Months or Yearly, and continue. Online payment through Razorpay is being rolled out — until it is switched on for your workspace, tap Request Upgrade and our team will activate Pro for you shortly. When your period is about to end, use the same page to renew or extend.",
  },
  {
    category: "plans",
    q: "What happens when my Pro period ends?",
    a: "Your workspace automatically goes back to the Free plan — nothing to cancel. Your data is never deleted. If you have more events, team members, services or leads than Free allows, everything stays visible; you just can't add new records beyond the Free limit until you upgrade again. Pro-only features become unavailable until you renew.",
  },
  {
    category: "plans",
    q: "Can I export my data?",
    a: "Yes. Data export in Preferences is available on every plan. Excel/CSV exports of your lists — events, clients, team, leads, quotations, invoices and financials — are part of Pro.",
  },

  // ---------------------------------------------------------------- Features
  {
    category: "features",
    home: true,
    q: "Can I create quotations and invoices?",
    a: "Yes, on every plan. Build a client-ready quotation (with your logo on Pro) and generate invoices — full or milestone-based — from the same details. Sharing a live link with your client, where they can review and sign online, is a Pro feature.",
  },
  {
    category: "features",
    q: "Can clients sign quotations online?",
    a: "Yes. With Pro you send a secure link; your client reviews the quotation online and signs digitally — no printing or scanning. You can hide team names on the client's view if you'd rather show roles only.",
  },
  {
    category: "features",
    q: "Can I track milestone and partial payments?",
    a: "Yes. Create payment milestones (advance, event day, final handover), link them to invoices, and record each payment as it arrives. Kramasha keeps paid and pending balances up to date for every event, and you can share a payment receipt as an image straight to WhatsApp or anywhere else.",
  },
  {
    category: "features",
    home: true,
    q: "Can I manage my team?",
    a: "Yes. Add team members with roles and rates, assign them to events for specific dates, and use the availability calendar to avoid double-bookings. Pro adds a Team Portal, where each member logs in to see their own bookings and job sheets.",
  },
  {
    category: "features",
    q: "What is the Client Portal?",
    a: "A password-protected page you share with a client (Pro) where they can follow their project — quotation, schedule, progress and payments — without calling you for updates.",
  },
  {
    category: "features",
    q: "Can I track leads?",
    a: "Yes. Log enquiries as leads (up to 50 on Free, unlimited on Pro) and turn a lead into a client and project when it converts.",
  },
  {
    category: "features",
    q: "What are job sheets?",
    a: "A crew-ready summary of an event — schedule, locations, team and equipment — generated from the event's details. Print it or, with Pro, share it as a link with your team.",
  },
  {
    category: "features",
    q: "Can I manage expenses and see my profit?",
    a: "Yes. Record business and event expenses under categories that fit your business, and see income, expenses and profit per financial year. Payments to team members and service providers are tracked against each event.",
  },
  {
    category: "features",
    q: "Does Kramasha support GST?",
    a: "GST is optional and off by default. If you're GST-registered, add your GSTIN and details during setup or in Preferences, and choose a default rate. If you're not registered, you'll never see tax fields.",
  },
  {
    category: "features",
    q: "How do reminders and notifications work?",
    a: "In-app reminders are free: upcoming events this week and overdue client payments are flagged on your Events page and in the notification bell. Pro adds push notifications to your device. You can also add any event to your Google or Apple calendar with one tap from the event page.",
  },
  {
    category: "features",
    q: "Can I use international phone numbers?",
    a: "Yes. Clients, team members and leads can have Indian mobile numbers or international numbers with a country code (for example +44 7911 123456). Numbers pasted from WhatsApp or your contacts are cleaned up automatically — spaces, dashes and brackets are removed.",
  },
  {
    category: "features",
    q: "Can I change how the app looks?",
    a: "Yes. The default theme is free. Pro adds the Night theme and the Pastel theme, where you pick one of five pastel colours and the whole app follows it. You can also show or hide menu labels on mobile.",
  },

  // ---------------------------------------------------------------- Data & security
  {
    category: "security",
    home: true,
    q: "Is my data safe?",
    a: "Yes. Every business gets its own private, isolated workspace — nobody else can see your events, clients, team, or payments. Data is encrypted in transit and at rest. See our Privacy Policy for full detail.",
  },
  {
    category: "security",
    q: "Is my data encrypted?",
    a: "Yes, in two ways: In transit — every connection between your device and our servers is encrypted (HTTPS/TLS), the same standard used by banking and payment websites. At rest — your data is encrypted while stored on our servers, using industry-standard encryption provided by our database infrastructure.",
  },
  {
    category: "security",
    q: "Can Kramasha (your company) see my financial data?",
    a: "We do not sell your data, use it for marketing, or show it to any other user or business. Other workspaces can never see your events, clients, or payments — that isolation is enforced at the database level, not just hidden in the app. Your data is not \"zero-knowledge\" or end-to-end encrypted; like most business software, Kramasha needs to read your data on the server to calculate totals, generate PDFs, run search, send reminders, and provide support. Access is restricted to a small number of authorized team members and only when necessary — to resolve a support ticket, investigate a technical/security issue, or where required by law. We do not browse or use your data for any other purpose.",
  },
  {
    category: "security",
    q: "Can I lock the app?",
    a: "Yes, on every plan. Turn on App Lock in Preferences → Security to protect Kramasha with a password, and add a passkey (Face ID, fingerprint or device PIN) to unlock faster. Choose whether it locks when you close the tab or after 5 or 15 minutes.",
  },

  // ---------------------------------------------------------------- Account & support
  {
    category: "account",
    q: "I forgot my password — what do I do?",
    a: "Use the \"Forgot password\" link on the login screen. We'll send a reset link to your registered email. For other account changes, contact support.",
  },
  {
    category: "account",
    q: "How do I see what's new?",
    a: "After each update, a \"What's new\" card shows the highlights. The full history is always available on the App Updates page, which you can open from the menu.",
  },
  {
    category: "account",
    home: true,
    q: "How do I get help or report a problem?",
    a: "Open Help in the app for guides and contact options, or email kramashaofficial@gmail.com. We usually reply within 24–48 hours, and your feedback directly shapes what we build next.",
  },
];

// Entries shown on the landing page (the rest live on /faq).
export const homeFaqs = faqContent.filter((f) => f.home);
