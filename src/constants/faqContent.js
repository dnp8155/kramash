// Single source for FAQ content — used by the /faq page (everything, grouped) and the
// landing page (only entries with `home: true`, plus a "Read more FAQs" link).
//
// Keep answers in step with the app: plan limits come from the Your Plan page and the plans table; the price answer
// is built from constants/launchOffer.js (launch prices while the offer runs, regular prices after).
import { LAUNCH_OFFER, getActiveLaunchOffer, isFreeMonthNoteVisible } from "@/constants/launchOffer";

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const perMonth = (price, months) => inr(Math.round(price / months));
const savePct = (price, months, monthly) => Math.round((1 - price / (monthly * months)) * 100);
const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

// "How much does Pro cost?" — launch prices (with the regular price for comparison) while the offer is on.
export function proPriceAnswer(now = new Date()) {
  const reg = LAUNCH_OFFER.listPrices;
  const offer = getActiveLaunchOffer(now);
  const tail = "Each is a single payment for that period of Pro access; nothing renews automatically, so you stay in control. Ready? [Here's how to upgrade](#how-do-i-upgrade-and-pay).";
  if (offer) {
    const p = LAUNCH_OFFER.offerPrices;
    return `Launch prices are on until ${longDate(LAUNCH_OFFER.endsOn)}: ${inr(p.MONTHLY)} for 1 month, ${inr(p.SIX_MONTHS)} for 6 months (about ${perMonth(p.SIX_MONTHS, 6)} a month) or ${inr(p.ANNUAL)} for 12 months (about ${perMonth(p.ANNUAL, 12)} a month — our best value). The regular prices, which apply afterwards, are ${inr(reg.MONTHLY)}, ${inr(reg.SIX_MONTHS)} and ${inr(reg.ANNUAL)}. ${tail}`;
  }
  return `${inr(reg.MONTHLY)} for 1 month, ${inr(reg.SIX_MONTHS)} for 6 months (about ${perMonth(reg.SIX_MONTHS, 6)} a month, roughly ${savePct(reg.SIX_MONTHS, 6, reg.MONTHLY)}% less) or ${inr(reg.ANNUAL)} for 12 months (about ${perMonth(reg.ANNUAL, 12)} a month, roughly ${savePct(reg.ANNUAL, 12, reg.MONTHLY)}% less — our best value). ${tail}`;
}

export const FAQ_CATEGORIES = [
  { key: "start", label: "Getting started" },
  { key: "plans", label: "Plans & pricing" },
  { key: "features", label: "Features" },
  { key: "security", label: "Data & security" },
  { key: "account", label: "Account & support" },
];

const rawFaqContent = [
  // ---------------------------------------------------------------- Getting started
  {
    category: "start",
    home: true,
    q: "What is Kramasha?",
    a: "Kramasha is a business management app for photographers, event managers, architects, interior designers, salons, consultants, agencies, caterers, contractors and other service businesses. Clients, events or projects, team, leads, quotations, invoices, payments and finances all live in one place — instead of spreadsheets and scattered chats. New here? [Create a free account](/register) or see [the free plan](#is-there-a-free-plan).",
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
    a: "Yes. The Free plan includes up to 5 events or projects, 3 team members, 5 services and 50 leads, with unlimited quotation and invoice creation, in-app reminders, WhatsApp sharing with message templates, your public profile page, App Lock and data export from Preferences. It's free to use for as long as you like. See [what Pro adds](#what-does-pro-add) or [how much it costs](#how-much-does-pro-cost).",
  },
  {
    category: "plans",
    home: true,
    q: "What does Pro add?",
    a: "Pro removes the limits — unlimited events, projects, services and leads, and up to 50 team members — and unlocks link sharing for quotations, invoices and job sheets, the [Client Portal](#what-is-the-client-portal) and Team Portal, push notifications, [emailing clients from your own Gmail](#how-do-i-message-my-clients-by-whatsapp-or-email) (sending, scheduling and automatic reminders), Excel/CSV exports, the Night and Pastel themes, event display controls (show or hide team and services, logo on shared receipts) and your logo on quotations. See [pricing](#how-much-does-pro-cost) or [how to upgrade](#how-do-i-upgrade-and-pay).",
  },
  {
    category: "plans",
    home: true,
    q: "How much does Pro cost?",
    a: proPriceAnswer(),
  },
  // Launch offer — hidden together with the landing page note (isFreeMonthNoteVisible() in constants/launchOffer.js).
  ...(isFreeMonthNoteVisible() ? [{
    category: "plans",
    home: true,
    q: "Can I try Pro for free?",
    a: "During our launch we're giving selected early users 1 month of Pro free — spots are limited. Sign up, open [Your Plan](/plan) and tap Request Upgrade; we verify each request and activate your free month. It never charges you automatically: after the month you can continue on any plan, or simply stay on Free — your data is kept either way.",
  }] : []),
  {
    category: "plans",
    q: "How do I upgrade and pay?",
    a: "Open [Your Plan](/plan) (in the menu), choose Monthly, 6 Months or Yearly, and continue. Online payment through Razorpay is being rolled out — until it is switched on for your workspace, tap Request Upgrade and our team will activate Pro for you shortly. When your period is about to end, use the same page to renew or extend. Wondering what happens afterwards? See [what happens when my Pro period ends](#what-happens-when-my-pro-period-ends).",
  },
  {
    category: "plans",
    q: "What happens when my Pro period ends?",
    a: "Your workspace automatically goes back to the Free plan — nothing to cancel. Your data is never deleted. If you have more events, team members, services or leads than Free allows, everything stays visible; you just can't add new records beyond the Free limit until you [upgrade](/plan) again. Pro-only features become unavailable until you renew. You can always [export your data](#can-i-export-my-data) first.",
  },
  {
    category: "plans",
    q: "How do I cancel, and can I get a refund?",
    a: "Pro is prepaid and never renews by itself, so there is nothing to cancel and you will not be charged again. You keep Pro until the end of the period you paid for, then your workspace moves to Free. Fees are non-refundable once paid, except a duplicate payment, a payment that was debited but did not activate Pro, or where the law requires a refund. To request one, email [kramashaofficial@gmail.com](mailto:kramashaofficial@gmail.com) from the address you sign in with, with your business name, the payment date and amount, and the Razorpay payment ID. We reply within 1–2 business days, and an approved refund reaches your original payment method in 5–7 business days. Full details are in our [Terms](/terms).",
  },
  {
    category: "plans",
    q: "Can I export my data?",
    a: "Yes. [Data export in Preferences](/preferences?group=app) is available on every plan. Excel/CSV exports of your lists — events, clients, team, leads, quotations, invoices and financials — are part of Pro.",
  },

  // ---------------------------------------------------------------- Features
  {
    category: "features",
    home: true,
    q: "Can I create quotations and invoices?",
    a: "Yes, on every plan. Build a client-ready quotation (with your logo on Pro) and generate invoices — full or milestone-based — from the same details. Sharing a live link with your client, where they can [review and sign online](#can-clients-sign-quotations-online), is a [Pro feature](#what-does-pro-add).",
  },
  {
    category: "features",
    q: "Can clients sign quotations online?",
    a: "Yes. With Pro you send a secure link; your client reviews the quotation online and signs digitally — no printing or scanning. You can hide team names on the client's view if you'd rather show roles only. Paying in parts? See [milestone and partial payments](#can-i-track-milestone-and-partial-payments).",
  },
  {
    category: "features",
    q: "Can I track milestone and partial payments?",
    a: "Yes. Create payment milestones (advance, event day, final handover), link them to invoices, and record each payment as it arrives. Kramasha keeps paid and pending balances up to date for every event, and you can share a payment receipt as an image straight to WhatsApp or anywhere else.",
  },
  {
    category: "features",
    home: true,
    q: "How do I message my clients by WhatsApp or email?",
    a: "Open an event or project and tap Send message. Pick **WhatsApp** or **Gmail** (it shows the client's number and email), choose a template, check the preview and send. WhatsApp opens with the message ready and you tap Send, which is free on every plan. Gmail sends the email for you from your own address and it lands in your Sent folder; connecting Gmail is a [Pro feature](#what-does-pro-add). You can also schedule a message for later. Templates are in [Preferences](/preferences?group=business), under Connections.",
  },
  {
    category: "features",
    q: "How do I connect Gmail, and can Kramasha read my emails?",
    a: "Go to [Preferences](/preferences?group=business), open Connections and tap Connect Gmail (Pro). Google asks you to allow one thing only: sending email on your behalf. Kramasha can only send. It cannot read, search or delete anything in your mailbox. Emails go from your own address and appear in your Sent folder. You can disconnect any time from the same place, or remove access in your Google Account. While Gmail is disconnected, scheduled and automatic emails are not sent, and Kramasha warns you first if any are waiting.",
  },
  {
    category: "features",
    q: "Can reminders go out automatically?",
    a: "Yes, with Pro and a connected Gmail. In Preferences, under Connections, switch on the automatic messages you want: payment reminders (days before, on the due date and while overdue), a coming-up reminder, a thank-you after the event, and a yearly anniversary wish. You choose the template, the number of days and the time of day. WhatsApp can't be sent for you, so a WhatsApp rule sends you a reminder with the message ready to send, which is free. Automatic emails show an Auto tag on the event's Activity tab. A WhatsApp message that is ready to send can be closed with the X if you decide not to send it, and its notification is removed.",
  },
  {
    category: "features",
    q: "Can I see whether my client received or opened a message?",
    a: "Yes, on the event's Activity tab under Messages. Emails show Sent, Likely opened and Link clicked. Opening is only a hint because some email apps block or pre-load the tracking image, so a click on the link is the surest sign. WhatsApp can't be tracked by Kramasha: a message shows as Shared until you mark it as sent.",
  },
  {
    category: "features",
    home: true,
    q: "Can I manage my team?",
    a: "Yes. Add team members with roles and rates, assign them to events for specific dates, and use the availability calendar to avoid double-bookings. [Pro](#what-does-pro-add) adds a Team Portal, where each member logs in to see their own bookings and job sheets.",
  },
  {
    category: "features",
    q: "What is the Client Portal?",
    a: "A password-protected page you share with a client ([Pro](#what-does-pro-add)) where they can follow their project — quotation, schedule, progress and payments — without calling you for updates. Clients can also [sign quotations online](#can-clients-sign-quotations-online).",
  },
  {
    category: "features",
    q: "Can I track leads?",
    a: "Yes. Log enquiries as leads (up to 50 on Free, unlimited on Pro), move each one through New, Contacted, Qualified, Negotiation, Won or Lost, set follow-up dates, and turn a lead into a client and project when it converts. Leads also arrive on their own from your [profile's inquiry form](#can-visitors-send-me-an-inquiry-from-my-profile). Financial → Reports has a [Leads report](#what-reports-does-kramasha-have) showing your conversion rate. Limits are listed under [the Free plan](#is-there-a-free-plan).",
  },
  {
    category: "features",
    home: true,
    q: "What is My Profile?",
    a: "My Profile is your own shareable page, with a link such as kramasha.com/p/your-name. Show your logo, About text, services, testimonials, videos from YouTube or Vimeo, a Google Map, links and downloads, FAQs, contact details and social links. You choose which sections appear, name them your way and put them in any order. It works on every plan: open [My Profile](/my-profile) to set it up. Your logo is a [Pro feature](#what-does-pro-add).",
  },
  {
    category: "features",
    home: true,
    q: "Can visitors send me an inquiry from my profile?",
    a: "Yes. Switch on the inquiry form in [My Profile](/my-profile) and visitors see a Send an inquiry button. They enter their name, phone or email, the type of work, a date and a message, and it arrives in [Leads](#can-i-track-leads) as a new Website lead, with a notification for you. Follow up there and convert it into a client and project when they confirm. You always get a bell notification; on Pro you also get a push alert on your phone. Inquiries count toward your plan's lead limit, so once a Free workspace reaches 50 leads, the form asks visitors to contact you directly. [My Profile](/my-profile) shows how many of your 50 leads are used.",
  },
  {
    category: "features",
    q: "Can I add videos, a map or photos to my profile?",
    a: "Videos and maps, yes: paste a YouTube or Vimeo link, or a Google Maps link, into a section on [My Profile](/my-profile) and the video or map appears on your page. Each section has a limit: 4 videos, 6 testimonials, 8 FAQs and 1 map (up to 12 items for the others), and the section header shows how many you have used. Use a full Google Maps link to show the map itself; a short maps.app.goo.gl link opens in Google Maps instead. Photos are not uploaded to Kramasha, but you can link to your portfolio, Behance, Instagram or a Drive folder in a Links section.",
  },
  {
    category: "features",
    home: true,
    q: "Can I note where my files are saved?",
    a: "Yes, on every plan. Add your drives, memory cards or cloud spaces once on the [Storage](/storage) page, then open any job's Storage tab and note which drive and folder its files are in, plus subfolders and whether it is the original, a backup, the final version or what you shared with the client. Later you can search by client, folder, drive or note to find it again. See also [how to tell if a job is backed up](#how-do-i-know-if-a-job-is-backed-up).",
  },
  {
    category: "features",
    q: "Does Kramasha store my photos and files?",
    a: "No. Storage only keeps a note of where your files are: the drive name, the folder path and subfolders. Your actual photos, videos and documents stay on your own drives or cloud, and nothing from them is uploaded or read. Because of that, Kramasha cannot check the drive itself, so it goes by what you have noted. [Learn how to note where files are saved](#can-i-note-where-my-files-are-saved).",
  },
  {
    category: "features",
    q: "How do I know if a job is backed up?",
    a: "Each job's Storage tab counts the separate places its files are saved (for example, \"2 copies\") and warns you when there is only one. On the [Storage](/storage) page, the Needs backup button lists every job that has a single copy, so you can fix them in one go. Mark each copy as Original or Backup so it is clear which is which.",
  },
  {
    category: "features",
    q: "Can I hide the Storage tab?",
    a: "Yes. On the [Storage](/storage) page, switch off Show Storage tab to remove the tab from every job page, and its line from the Activity tab. The Storage page and your list of drives stay available, and nothing you have saved is lost. Switch it back on any time. Related: [noting where files are saved](#can-i-note-where-my-files-are-saved).",
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
    a: "GST is optional and off by default. If you're GST-registered, add your GSTIN and details during setup or in [Preferences](/preferences), and choose a default rate. If you're not registered, you'll never see tax fields. Once you issue invoices with GST, Financial → Reports → GST sums them up by month. See [the reports](#what-reports-does-kramasha-have).",
  },
  {
    category: "features",
    q: "What reports does Kramasha have?",
    a: "Financial → [Reports](/financial) has seven views for the financial year you pick: Overview (received, paid and profit by month), Expenses, By event, Clients (who owes you), Team (payouts), Leads (how many enquiries became clients, by source and why some were lost) and GST (taxable value and CGST, SGST or IGST by month, from issued invoices). Each can be exported to Excel. GST figures are a summary to help you, so check them with your accountant before filing.",
  },
  {
    category: "features",
    q: "How do I share my profile page?",
    a: "Open your page and tap the small share icon in the top-right corner of the header. On a phone it opens your share sheet (WhatsApp, Instagram and so on); on a computer it copies the link. You can also copy the link from [My Profile](/my-profile). Your link is locked once you publish, so share it freely.",
  },
  {
    category: "features",
    q: "Who can see my phone, email and address on my profile?",
    a: "Only what you switch on under Show on your profile in [My Profile](/my-profile). Details you hide are not just covered on the page: they are left out of what is sent to visitors. Hiding social links works the same way.",
  },
  {
    category: "features",
    q: "How do reminders and notifications work?",
    a: "In-app reminders are free: upcoming events this week and overdue client payments are flagged on your Events page and in the notification bell. Pro adds push notifications to your device. You can also add any event to your Google or Apple calendar with one tap from the event page.",
  },
  {
    category: "features",
    q: "What is the difference between Reminders and Notifications?",
    a: "Reminders are the list at the top of your Events page (the bell with a Reminders label). It is a live to-do list of what needs you right now: events coming up this week, events with money still pending from the client, and finished events whose client still owes you. Tap a line to open that event, or tap the X to remove it so it never comes back. The list updates by itself as you record payments, and it only appears on the Events page. Notifications are the bell in the top bar, a running history of alerts: an event or payment reaching its reminder day, a lead's follow-up date, a client signing a quotation, your plan expiring. Each stays until you mark it read or clear it, and with Pro the same alerts also arrive as push notifications on your device, even when the app is closed. In short: Reminders show what is pending today; Notifications tell you when something happens. Choose which alerts you get, and when, under Notifications in [Preferences](/preferences). Reminders that go out to your clients are different again: see [Can reminders go out automatically?](#can-reminders-go-out-automatically).",
  },
  {
    category: "features",
    q: "Can I add pictures to my quotation PDF?",
    a: "Yes — on the Modern Style and Custom templates you can add up to 3 pictures (Beta). Pick them from your phone or computer, or paste a web link. Pictures picked from a device stay on that device and are never uploaded, so make the PDF on the same device you picked them on.",
  },
  {
    category: "features",
    q: "Is Kramasha available in Hindi and Gujarati?",
    a: "Yes. Switch the language from the top bar or in Preferences. Translation is in beta, so some text may not be translated correctly or may still appear in English — we're improving it.",
  },
  {
    category: "features",
    q: "Can I sign a PDF?",
    a: "Yes, on every plan. Open [Sign a PDF](/sign-pdf) from the menu, upload a PDF, draw or type your signature, place it on the page and download the signed copy. It all happens in your browser — your file isn't uploaded — and you can save your signature on your device for next time.",
  },
  {
    category: "features",
    q: "Can I use international phone numbers?",
    a: "Yes. Clients, team members and leads can have Indian mobile numbers or international numbers with a country code (for example +44 7911 123456). Numbers pasted from WhatsApp or your contacts are cleaned up automatically — spaces, dashes and brackets are removed.",
  },
  {
    category: "features",
    q: "Can clients and my team add event dates to their calendar?",
    a: "Yes, and it is optional. On the client's project page, and on each upcoming job in the team portal, there is an Add to calendar button. It offers Google Calendar, or a file that opens in Apple Calendar and Outlook (it also works with Google). Each day of the event is its own calendar entry, such as Day 1 and Day 2, with the venue and, for your team, their role. It never includes any amounts, and it is a copy at that moment, so a later change to the dates will not update it.",
  },
  {
    category: "features",
    q: "Can I show my Instagram photos on my profile page, and why won't my account connect?",
    a: "Yes. In [My Profile](/my-profile), connect Instagram and your latest photos appear on your page. Kramasha can only read your photos; it can never post or change anything. Some accounts can't connect because of a rule from Meta (Instagram and Facebook): the account must be an Instagram Business or Creator account (both are called a professional account), and it must be linked to a Facebook Page. A personal account, or a professional account with no Page, will not appear. To fix it, switch to a professional account in Instagram under Settings, link a Facebook Page, then sign in with Facebook as someone who manages that Page and choose both the Page and the Instagram account. You can disconnect any time, and your photos then disappear from your profile.",
  },
  {
    category: "features",
    q: "What is the AI assistant, and is my data safe with it?",
    a: "The assistant (the robot icon at the top of the app) answers questions about your own workspace, such as who owes what or which events are coming up, and about how to use Kramasha. It only reads and explains; it cannot change, send or pay anything, and it can make mistakes, so check money amounts on the Financial page before relying on them. To answer, your message and the workspace data it needs are processed by Google's Gemini service, and we do not use your data to train any AI model of our own. Your chat is kept for 30 days and you can delete it earlier with the bin icon. It is optional: if you never use it, nothing is sent. See the [Privacy Policy](/privacy) for details.",
  },
  {
    category: "features",
    q: "Can I change how the app looks?",
    a: "Yes. The default theme is free. Pro adds the Night theme and the Pastel theme, where you pick one of five pastel colours and the whole app follows it. You can also show or hide menu labels on mobile. See [what Pro adds](#what-does-pro-add).",
  },

  // ---------------------------------------------------------------- Data & security
  {
    category: "security",
    home: true,
    q: "Is my data safe?",
    a: "Yes. Every business gets its own private, isolated workspace — nobody else can see your events, clients, team, or payments. Data is encrypted in transit and at rest. See our [Privacy Policy](/privacy) for full detail, or [how we encrypt it](#is-my-data-encrypted).",
  },
  {
    category: "security",
    q: "What happens to the details people send through my profile's inquiry form?",
    a: "They are saved as a lead in your workspace and shared only with you, never shown on your public page and never used by Kramasha for marketing. You are in charge of that data: use it only to reply to the person, and delete it when you no longer need it. To keep spam out, the form uses a hidden trap and a short background check, and the visitor's network address is only held briefly in temporary memory, not saved with the inquiry. See the [Privacy Policy](/privacy) and [Terms](/terms), or [how inquiries work](#can-visitors-send-me-an-inquiry-from-my-profile).",
  },
  {
    category: "security",
    q: "Is my data encrypted?",
    a: "Yes, in two ways: In transit — every connection between your device and our servers is encrypted (HTTPS/TLS), the same standard used by banking and payment websites. At rest — your data is encrypted while stored on our servers, using industry-standard encryption provided by our database infrastructure. Questions about who can see it? Read [Can Kramasha see my financial data?](#can-kramasha-see-my-financial-data)",
  },
  {
    category: "security",
    q: "Can Kramasha see my financial data?",
    a: "We do not sell your data, use it for marketing, or show it to any other user or business. Other workspaces can never see your events, clients, or payments — that isolation is enforced at the database level, not just hidden in the app. Your data is not \"zero-knowledge\" or end-to-end encrypted; like most business software, Kramasha needs to read your data on the server to calculate totals, generate PDFs, run search, send reminders, and provide support. Access is restricted to a small number of authorized team members and only when necessary — to resolve a support ticket, investigate a technical/security issue, or where required by law. We do not browse or use your data for any other purpose. Read our [Privacy Policy](/privacy) for details.",
  },
  {
    category: "security",
    q: "Can I lock the app?",
    a: "Yes, on every plan. Turn on App Lock in [Preferences → Security](/preferences?group=account) to protect Kramasha with a password, and add a passkey (Face ID, fingerprint or device PIN) to unlock faster. Choose whether it locks when you close the app or after a set time away, from 1 minute up to an hour.",
  },

  // ---------------------------------------------------------------- Account & support
  {
    category: "account",
    q: "I forgot my password — what do I do?",
    a: "Use the [Forgot password](/forgot-password) link on the login screen. We'll send a reset link to your registered email. For other account changes, [contact support](#how-do-i-get-help-or-report-a-problem).",
  },
  {
    category: "account",
    q: "How do I see what's new?",
    a: "After each update, a \"What's new\" card shows the highlights. The full history is always available on the [App Updates](/app-updates) page, which you can open from the menu.",
  },
  {
    category: "account",
    home: true,
    q: "How do I get help or report a problem?",
    a: "Open [Help](/help) in the app for guides and contact options, or email kramashaofficial@gmail.com. We usually reply within 24–48 hours, and your feedback directly shapes what we build next. See also our [Terms](/terms) and [Privacy Policy](/privacy).",
  },
];

export const faqSlug = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Every entry gets a slug (the /faq#slug anchor).
export const faqContent = rawFaqContent.map((f) => ({ ...f, slug: faqSlug(f.q) }));

// Answer text without the [label](target) link markup — for structured data / plain text.
export const plainAnswer = (a) => a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

// FAQ search: the positions (in faqContent) of every entry whose question or answer contains all the words typed.
// Case does not matter, and link markup in answers is ignored. An empty search matches nothing (the page shows everything).
const faqSearchText = faqContent.map((f) => `${f.q} ${plainAnswer(f.a)}`.toLowerCase());
export function faqSearchTerms(query) {
  return String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
}
export function faqMatches(query) {
  const terms = faqSearchTerms(query);
  if (!terms.length) return new Set();
  return new Set(faqContent.map((_, i) => i).filter((i) => terms.every((t) => faqSearchText[i].includes(t))));
}

// Entries shown on the landing page (the rest live on /faq).
export const homeFaqs = faqContent.filter((f) => f.home);
