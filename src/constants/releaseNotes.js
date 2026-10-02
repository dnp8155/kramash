// Central changelog. Bump APP_CONFIG.version (src/lib/appConfig.js) with each
// release and add a matching entry here — WhatsNewDialog and the App Updates
// page both read from this single source.
//
// Newest release goes first. Each note can be either a plain string (simple
// bullet) or a rich { icon, title, description } object — WhatsNewDialog and
// the App Updates page render both, but new releases should use the rich
// form so they get an icon badge + heading + description.
export const RELEASE_NOTES = [
  {
    version: "1.1.4",
    date: "2026-10-01",
    notes: [
      {
        icon: "Smartphone",
        title: "The app updates only when you choose",
        description: "A new version never changes the app under you. When one is ready, a banner shows the version you're on with an Update now button (and an X to dismiss it). Tap Update now and this What's new sheet opens once it's done.",
      },
      {
        icon: "Link2",
        title: "Choose your own public profile URL",
        description: "Type the web address you want, see right away whether it's available or taken, and it locks permanently when you save. On mobile the full link is shown with Copy and Open buttons.",
      },
      {
        icon: "Receipt",
        title: "Set a final total on quotations and invoices",
        description: "Type the exact amount you want to charge, for example to match the contract value. The difference appears as a Round off / Adjustment line on the PDF and on the pages your client sees, and the total stays put when you add or remove items.",
      },
      {
        icon: "Share2",
        title: "Excel export that matches your books",
        description: "Data Export now gives a Main Summary plus one sheet per client with their details, transactions, team, services, notes and description. Pick a financial year, month, year, custom range or all time. Dates, currency and number format follow your preferences. The Events page, Financial page and Payment activity exports work the same way, and phones open the share sheet.",
      },
      {
        icon: "BellRing",
        title: "Private notifications that stay up to date",
        description: "Notifications, reminders and plan alerts are only for you and only for your workspace. If an event's dates change, its notification updates and is marked Rescheduled. Email notifications have been removed.",
      },
      {
        icon: "ListChecks",
        title: "Setup checklist you can bring back",
        description: "The setup checklist has a progress bar and uses wording for your kind of business. If you close it, a Complete setup button in Preferences next to Change Password brings it back.",
      },
      {
        icon: "CalendarDays",
        title: "Accepting a quotation no longer renames your event",
        description: "Your event or project keeps its name, type, venue, description and notes. Only the dates, contract value and client link follow the quotation.",
      },
      {
        icon: "Type",
        title: "Better Hindi and Gujarati",
        description: "Wording has been corrected across the app, and more screens now translate, including Team, Leads, Clients, Calendar and Rate Estimator.",
      },
      {
        icon: "Sparkles",
        title: "Smaller fixes",
        description: "New pages open at the top. The name you enter in setup now matches Preferences. Pro themes no longer show a crown if you're on Pro. The install tabs end after the last title. The AI assistant now uses a current Gemini model.",
      },
    ],
  },
  {
    version: "1.1.3",
    date: "2026-09-30",
    notes: [
      {
        icon: "GitBranch",
        title: "Revise quotations and invoices",
        description: "Client wants changes after you've sent or accepted a quotation? Tap Revise to make a new draft (Q-001-R2). Once you finalize it, the older version is cancelled and the link you already shared opens the new one. Invoices work the same way (until a payment is recorded).",
      },
      {
        icon: "CalendarDays",
        title: "Create Quotation from an event, filled day by day",
        description: "Team members now land on the dates they're working, services run across the event days, and add-ons and extras are included — with the total shown and linked to the event's contract value.",
      },
      {
        icon: "UserRoundPen",
        title: "Custom clients on invoices too",
        description: "A quotation made for a custom name now carries that name into its invoice, and you can enter a custom client directly on an invoice. Creating an invoice from an accepted quotation works again as well.",
      },
      {
        icon: "Percent",
        title: "GST on invoices works like quotations",
        description: "The GST option only appears when GST is enabled for your workspace, you pick CGST + SGST or IGST, and issuing is blocked until your GSTIN is set. Discount & GST now looks the same on quotations and invoices.",
      },
      {
        icon: "Landmark",
        title: "Invoice details load from your workspace",
        description: "Bank & UPI, social links (now with Twitter/X and extra links) and payment terms each have a Load from workspace button. The due date now follows the issue date and can't be set before it.",
      },
      {
        icon: "Receipt",
        title: "Invoice page matches the quotation page",
        description: "All actions now sit in one bar at the bottom, and the header shows the client, status tag and invoice number. Finalize and Issue Invoice are green.",
      },
      {
        icon: "Eye",
        title: "Cleaner invoice preview and portal",
        description: "The invoice preview no longer has a gap above its toolbar, and uses the same Print / Download PDF / Close buttons as the quotation preview. The public invoice footer no longer shows the copyright line.",
      },
      {
        icon: "FileText",
        title: "Quotation PDFs and client link, polished",
        description: "New quotations are valid for 3 days by default (and can't end on the quotation date). PDFs now use your real business, client, bank and social details, show your logo, use icons for phone, email and address, take payment milestones straight from the quotation, and keep long terms inside the page. Apply Package shows your currency symbol, and the client portal shows roles instead of names when names are hidden.",
      },
      {
        icon: "Printer",
        title: "Job sheet and PDF signing fixed",
        description: "The job sheet preview is sharp and scrolls, and Print now prints only the job sheet instead of the whole page. Signing a PDF is sharper and scrolls properly in the mobile sheet. The back button is gone from the client project portal.",
      },
      {
        icon: "ShieldCheck",
        title: "Passkeys now work across your devices",
        description: "A passkey saved in iCloud Keychain or Google Password Manager can now unlock the app on your other devices too, or from your phone via QR code. Passkeys you already saved keep working.",
      },
      {
        icon: "Crown",
        title: "Plans page shows all three Pro plans",
        description: "Monthly ₹219, 6 Months ₹1,099 and Yearly ₹1,999, with Yearly highlighted as Most Popular.",
      },
      {
        icon: "Mail",
        title: "Cleaner email and phone fields, faster onboarding",
        description: "Email fields across the app strip stray characters and check the address strictly, and phone fields accept international numbers and clean pasted ones. Onboarding sets up your workspace much faster, retries failed steps, and uses the same rounded fields as Sign in.",
      },
      {
        icon: "ListChecks",
        title: "Defaults now match your business type",
        description: "An architecture or interior workspace no longer gets photography leftovers like Album Printing, Photographer roles or Bride/Groom Side. Expense categories, roles, services and hints follow your category.",
      },
      {
        icon: "Smartphone",
        title: "Install steps for your phone",
        description: "The install prompt now detects Android or iPhone and shows the matching steps in a sheet. The same steps are on the App & Updates page.",
      },
      {
        icon: "WifiOff",
        title: "Offline banner on every screen, with Refresh",
        description: "The offline banner now also shows on login, onboarding and public pages, appears faster, and no longer reloads the page when you're back online. Notices about data that couldn't load now have a Refresh button, and the Something went wrong screens have a fresh look.",
      },
      {
        icon: "Share2",
        title: "Share Invoice preview and cleaner receipts",
        description: "Share Invoice shows a preview first and no longer pastes the image twice. Receipts include the reference and note when there are any and end with \"Invoice generated with Kramasha!\". Edit and Delete buttons on payment, team and service cards are less heavy.",
      },
      {
        icon: "Palette",
        title: "Look and feel updates",
        description: "A reworked pastel theme, toasts with a full border, a slimmer glassy bottom bar on mobile, quieter desktop scrollbars, tab menus that behave the same everywhere, rounder Preferences cards, a client icon in the event forms, clearer dashboard and events headings, a tidier mobile More menu, and an updated FAQ page.",
      },
    ],
  },
  {
    version: "1.1.2",
    date: "2026-09-29",
    notes: [
      {
        icon: "Hash",
        title: "Events & projects now get a permanent ID",
        description: "Each event/project now gets its own sequential ID per financial year (like 01-2026) instead of a random code — it's never reused, even if the event is deleted.",
      },
      {
        icon: "CalendarPlus",
        title: "Add to Calendar fixed on iOS",
        description: "Tapping Add to Calendar on iPhone/iPad now opens Apple's native calendar sheet again, instead of the generic share menu the Android fix had accidentally routed it through too.",
      },
      {
        icon: "WifiOff",
        title: "Offline banner, now actually reliable",
        description: "The \"You're offline\" banner now checks real connectivity instead of trusting your browser's often-wrong network status, shows up within seconds, and animates smoothly in and out instead of popping abruptly.",
      },
      {
        icon: "BellRing",
        title: "Push notifications, for real this time",
        description: "Enable, disable, and Send Test in Preferences → Notifications now control real push notifications on your device — and notification types only show once you've actually turned one on.",
      },
      {
        icon: "ShieldCheck",
        title: "App Lock and Passkey, fixed",
        description: "App Lock previously failed to save due to a missing setting on our end — that's fixed, and registering a Passkey now correctly turns App Lock on instead of silently doing nothing.",
      },
      {
        icon: "CalendarDays",
        title: "Your date format preference now applies everywhere",
        description: "The date style you choose in Preferences (like 31 Dec 2026) now actually applies across the app, instead of every page always showing the same style regardless of your setting.",
      },
      {
        icon: "Link2",
        title: "Client-facing links fixed",
        description: "Job sheet and client project portal links were failing to load — fixed. Their browser tab titles and the Client Portal's design are also cleaner now.",
      },
      {
        icon: "Users",
        title: "Team Calendar now shows services correctly",
        description: "Services assigned to an event now show up in the Team page's Calendar tab without extra setup, and Team & Services now sit side by side on desktop instead of stacked.",
      },
      {
        icon: "UserCog",
        title: "Fixed a crash when assigning team members",
        description: "Assigning or editing a team member who doesn't have a role set no longer fails with a database error.",
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-09-28",
    notes: [
      {
        icon: "CalendarRange",
        title: "Events grouped by Today, Tomorrow, This Week & more",
        description: "Your events/projects list now groups into clear sections — Today, Tomorrow, This Week, This Month, Upcoming, and everything else — so you always know what's coming up first.",
      },
      {
        icon: "UserCog",
        title: "Fixed: editing a team member could lose their role",
        description: "If a member's role had since been marked inactive in Preferences, editing them showed a blank role field even though they still had one. Their current role now always shows, even if it's been deactivated.",
      },
      {
        icon: "Users",
        title: "Team availability, polished",
        description: "The Self tag in Team's Upcoming Bookings now matches the rest of the app, the Services section always shows (even when empty), and a stray dot next to upcoming events is gone.",
      },
      {
        icon: "BellRing",
        title: "Reminders now read like real sentences",
        description: "This week's upcoming events in the Events page reminders now show a full sentence with the date and any amount still pending, instead of just a bare dot and date.",
      },
      {
        icon: "ListChecks",
        title: "Leads page, easier to scan",
        description: "All dates now show in full instead of truncating, Source has its own colored badge like Priority, and each lead now shows its follow-up date with a circular edit/delete action.",
      },
      {
        icon: "Type",
        title: "Wording now matches your business type",
        description: "Date-selection screens on Events and Leads now say things like \"shoot day\" for photographers or \"site day\" for architects, instead of always saying \"shoot day\".",
      },
      {
        icon: "Sparkles",
        title: "Faster page loads, smarter titles",
        description: "Navigating between pages now shows a lighter loading indicator instead of the full splash screen, and every page sets its own browser tab title.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-27",
    notes: [
      {
        icon: "KeyRound",
        title: "Forgot password, redesigned",
        description: "The reset-password screen now matches the Client and Team portal sign-in pages — same layout, buttons, and text, with a preview panel on the right on desktop.",
      },
      {
        icon: "CalendarClock",
        title: "Financial year label follows your dates",
        description: "The label shown while adding a financial year now reflects the actual months you pick, and a new year defaults to your Region Settings' financial year start month instead of always assuming April.",
      },
      {
        icon: "Sparkles",
        title: "See what's new after every update",
        description: "After Kramasha updates in the background, a short summary of what changed — like this one — opens automatically the next time you open the app.",
      },
      {
        icon: "Ban",
        title: "Void & delete confirmations, clearer",
        description: "The amount and date are now bold in the void and delete confirmation dialogs, so you can double-check exactly what you're about to affect.",
      },
      {
        icon: "BellRing",
        title: "Reminders now flag overdue payments",
        description: "The Reminders panel on the Events page now calls out clients who still owe money on finished events, includes any team or service payment still due for that same event, and flags dues sitting in other financial years.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-25",
    notes: [
      {
        icon: "ListChecks",
        title: "Quotation category follows your business type",
        description: "Quotation category now correctly follows your workspace's business type instead of defaulting to Photography/Videography.",
      },
      {
        icon: "UserRoundPen",
        title: "Client name on the project portal",
        description: "The client project portal now shows the client's name.",
      },
      {
        icon: "UserCog",
        title: "Team roles and names shown consistently",
        description: "Team role and member name now display correctly and consistently on the client portal and quotation link.",
      },
      {
        icon: "Eye",
        title: "Hide Team Names, everywhere",
        description: "\"Hide Team Names\" now applies consistently everywhere and never sends the name to the browser when hidden.",
      },
      {
        icon: "Receipt",
        title: "New Invoices icon",
        description: "Invoices now use a rupee receipt icon in the sidebar and mobile menu.",
      },
      {
        icon: "WifiOff",
        title: "Install, offline and updates",
        description: "PWA install, offline shell, and update detection.",
      },
      {
        icon: "KeyRound",
        title: "Phone OTP sign-in",
        description: "Phone OTP architecture with provider configuration support.",
      },
      {
        icon: "Landmark",
        title: "Subscription payments",
        description: "Subscription payment gateway (Razorpay) integration.",
      },
      {
        icon: "FileText",
        title: "Excel / CSV export",
        description: "Export Events, Clients, Team, and Financial activity to Excel or CSV.",
      },
      {
        icon: "BellRing",
        title: "In-app notifications",
        description: "Notifications for event reminders and subscription expiry.",
      },
      {
        icon: "Sparkles",
        title: "Workspace logo and branded PDF",
        description: "Upload your workspace logo and get a branded quotation PDF.",
      },
    ],
  },
];

export function latestReleaseNotes() {
  return RELEASE_NOTES[0] || null;
}
