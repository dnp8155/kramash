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
    version: "1.1.7.3",
    date: "2026-10-10",
    notes: [
      {
        icon: "Users",
        title: "Accepted quotation → event, done right",
        description: "Syncing now brings over exactly the days you selected, and the message shows the real team, service and milestone counts. A Re-sync button is always there, and roles with no person show a “No member selected” card on the event.",
      },
      {
        icon: "ShieldCheck",
        title: "Mark as settled",
        description: "Once an event is over, close small leftover balances with one tap. It gets a Settled badge and stops all reminders and notifications. You can reopen it any time.",
      },
      {
        icon: "FileText",
        title: "Client PDFs look the same on every phone",
        description: "Text sizes and header icons now come out correctly when a client downloads a quotation on a phone, and the file saves under its proper name.",
      },
      {
        icon: "Palette",
        title: "A new look for your public profile",
        description: "A slowly moving pattern of small icons for your kind of business, coloured from your logo, now fills the header. Visitors can call or WhatsApp you in one tap, open your website, and find your social links in their own colours.",
      },
      {
        icon: "Crown",
        title: "Plans and small fixes",
        description: "Pro status is now accurate in every case — the upgrade banner no longer shows for Pro users, and expired or suspended plans are treated correctly. Team cards list every working day, Team Today shows your Self tag, and Upcoming looks clearer on phones.",
      },
    ],
  },
  {
    version: "1.1.7.2",
    date: "2026-10-09",
    notes: [
      {
        icon: "Wallet",
        title: "Client portal: correct Total Invoiced & Balance Due",
        description: "Draft and cancelled invoices no longer count towards Total Invoiced, and each invoice's balance now uses only the payments recorded against that invoice. Payments for other projects no longer reduce an unrelated balance.",
      },
      {
        icon: "Calendar",
        title: "Project page: dates match the quotation",
        description: "Multiple event dates now read the same way as on the quotation — for example “22 Nov, 09, 10, 11, 12 Dec 2026”.",
      },
      {
        icon: "FileText",
        title: "Excel exports: clearer file names",
        description: "Exports are now named after your business, the page and the date — for example “YourBusiness_Team_09Oct2026.xlsx”. What you see on the page (search and filters) is what gets exported.",
      },
    ],
  },
  {
    version: "1.1.7.1",
    date: "2026-10-09",
    notes: [
      {
        icon: "FileText",
        title: "Quotation & Invoice: calmer to work in",
        description: "Saving now happens in place — the page no longer reloads or jumps back to the top. After a save, the long cards (Terms & Conditions, Bank & UPI, Social Links, Signature, Template Settings, Notes) fold away like an accordion, and you can open any of them with a tap. Saved quotations and invoices open with them closed, so there is far less scrolling. The client's quotation page now lists days in date order.",
      },
      {
        icon: "Users",
        title: "Team on quotations: one person, more than one role",
        description: "Anyone can now be placed in any role slot — people whose main role matches come first, everyone else is listed under “Other team members”. When someone fills more than one role, the event shows a single card such as “Reg Photographer & Hybrid Photographer” with their amounts added together, and the role you chose on the quotation now carries over to the event correctly. Syncing an accepted quotation warns you about roles that still have no person.",
      },
      {
        icon: "Sparkles",
        title: "Faster pages and instant saves",
        description: "Event details now load in one go instead of step by step. A new team or service assignment appears on the event immediately, and editing a service or a team member updates the list at once while the save finishes in the background (it is undone with a message if it fails). Creating records is quicker too, and the plan-usage count refreshes as soon as you add or remove something. Events and Leads now show the upgrade message before the form opens when the plan limit is reached, like Team and Services.",
      },
      {
        icon: "Mail",
        title: "Sign-up checks and new email designs",
        description: "The sign-up page shows the password rules live as you type and tells you immediately whether both passwords match. Every email — verification codes, sign-in code, change of email, invitation, password reset, re-authentication and the welcome email — has a new Kramasha look, and code emails say the code is valid for 10 minutes.",
      },
      {
        icon: "ShieldCheck",
        title: "Smoother sign-in and sign-out",
        description: "Logging in no longer flashes the landing page before your workspace opens, and logging out goes to the login page once instead of showing it twice.",
      },
      {
        icon: "Wallet",
        title: "Clearer payment dots and currency icons",
        description: "The owner's dot on an event now follows the client's payment — red until money comes in, orange for a partial payment, green once paid in full — instead of always showing green. The money icon next to Contract, Payment Progress, Budget and Total Value now matches your workspace currency, and \"Go to Event\" on a lead now has its arrow after the text.",
      },
    ],
  },
  {
    version: "1.1.7",
    date: "2026-10-08",
    notes: [
      {
        icon: "Users",
        title: "Quotation: book by role, pick the member later",
        description: "Choose just a role for a day — the member is optional, because you may not know who is free yet. A role without a member shows “Member not selected yet” and can be given a person later from the same row. Custom items now ask whether they are a team member, a service or another item, and can use an existing role or service or a new one, so they list under the right heading in the PDF.",
      },
      {
        icon: "ListChecks",
        title: "Quotation: review, finalize prompts and dates",
        description: "A read-only Team, Services & Items summary (by date or general) now follows Template Settings, including custom items and deliverables. Finalizing offers to save custom-added roles, members and services to your lists so the event can get their cards, and warns when a role has no member or there is no team or service. Project dates now show as chips like the event form, with unused stretches folded into a “(…N)” chip.",
      },
      {
        icon: "FileText",
        title: "Quotation PDF: duplicates and blank pages",
        description: "Classic PDF lists each role once and “+1 Role” for every extra person, also when team names are hidden, and lists services the same way. The repeated “Events” line is gone, and a quotation or invoice PDF no longer ends with an empty last page. Cards on the quotation and invoice pages now use the same rounded corners as the Rate Estimator.",
      },
      {
        icon: "ListChecks",
        title: "Floating Save bar on Quotation, Invoice and Job Sheet",
        description: "Save, Finalize, Delete and Cancel now float at the bottom of the screen while you scroll, styled like the mobile menu, and glide into the button card when you reach it. An orange dot shows unsaved changes, and Save is only enabled when something changed. On the Job Sheet the bar offers PDF, Share, Print and Save and fades away at the top. Quotation and Invoice buttons are grouped in one card with a More menu.",
      },
      {
        icon: "ShieldCheck",
        title: "“Leave this page?” on Quotation, Invoice and Job Sheet",
        description: "If you have unsaved changes, the phone or browser Back button, the top-bar back arrow, Cancel and closing the tab now ask before you lose them. New documents ask once you have typed something. Moving around with the sidebar or menu does not ask.",
      },
      {
        icon: "Smartphone",
        title: "Smarter mobile menu",
        description: "The round button now follows the page: it shows that page’s own icon with a small + (Events, Clients, Team, Leads, Financial, Quotation, Invoices) and opens its Add form, and on More and Preferences it becomes Search. The More tab uses an ellipsis-circle icon. On iPhone the bar sits closer to the bottom like native apps, and on Android it keeps the frosted look with a stronger fill so text no longer shows through.",
      },
      {
        icon: "Eye",
        title: "Search on More and Preferences (mobile)",
        description: "On a phone, the header search on the More page filters its entries (“Search more”) and on Preferences it finds sections by name or related words such as theme, password or logo (“Search preferences”). On every other page it still searches events, clients and team.",
      },
      {
        icon: "Sparkles",
        title: "Animated numbers",
        description: "Stat cards on the Dashboard, Events, Clients, Team, Leads, Invoices, Quotations, Financial years and the Rate Estimator estimate now count up and glide to new values. Users with reduced motion see the final number straight away.",
      },
      {
        icon: "Wallet",
        title: "Dashboard “Payments” chart",
        description: "The chart is now titled Payments with Received and Paid switches, each with its own line. Paid is team payments plus business expenses, the same as in Financials.",
      },
      {
        icon: "Palette",
        title: "Template settings now work, and matching switches",
        description: "The “Sections to Show” switches in Template Settings were not connected to the PDF. They now hide or show Project Summary, Special Notes, Terms, Payment Method, Bank Details, Social Links and Footer in the PDF and the client link, and stay in step with each section’s own Show in PDF / Show in Link toggles. All switches in the app, including Share with Client, now look the same.",
      },
      {
        icon: "FileText",
        title: "Sign a PDF shows the page right away",
        description: "The PDF preview appears as soon as you upload a file, with < and > buttons and “Page X of N” instead of a dropdown. The signature box only appears once you have a signature.",
      },
      {
        icon: "Share2",
        title: "Fresh landing page",
        description: "The home section has a new look with floating app activity cards around a 2026-style iPhone (Dynamic Island and thin bezels) instead of a dashboard screenshot, and the phone mockups across the page match.",
      },
      {
        icon: "Gift",
        title: "Polish and fixes",
        description: "Loading skeletons were rebuilt to match each page on phone and desktop, and no longer show a doubled header on Clients, Leads and Team. The Reminders bell dot sits on the bell outline, the Rate Estimator add button matches Preferences, the Financial export is an icon on the right of the “Showing” row, the Events search keeps a steady width, and Financial and Event Details no longer open part-way scrolled down.",
      },
    ],
  },
  {
    version: "1.1.6.2",
    date: "2026-10-07",
    notes: [
      {
        icon: "KeyRound",
        title: "One saved password per client and team member",
        description: "A portal password no longer changes behind your back. Sharing again reuses the same link and password, and the password is saved so you can see and copy it on any device. If you do regenerate it, the old password keeps working for 48 hours. Both the client and team cards now have WhatsApp and \u201CCopy link + password\u201D buttons.",
      },
      {
        icon: "ShieldCheck",
        title: "Quotation and invoice links are always password protected",
        description: "Nothing opens until the password is entered \u2014 a password is created for you when you switch a link on, and clients type only the password (no email). Invoices use the password of the quotation they came from. The quotation and invoice pages now show the password with WhatsApp and copy buttons, and the login page carries the Kramasha logo.",
      },
      {
        icon: "Link2",
        title: "Share just the quotation",
        description: "The quotation link has its own on/off switch, so you no longer need to turn on the Client Project Portal to share a quotation. Switching it off really stops the link from opening.",
      },
      {
        icon: "Palette",
        title: "New PDF templates",
        description: "Choose between Classic Minimal, a redesigned Modern Style and Custom. Modern Style has a large cover picture, soft cards, milestone steps and your accent colour, with up to 3 pictures from web links (Google Drive and Dropbox work too). Custom lets you build the PDF from blocks \u2014 cover page, text, lists, tables, pictures, pricing, milestones \u2014 with your own letterhead and footer, and save layouts to reuse. Gold Premium and Navy Gold are retired.",
      },
      {
        icon: "MessageSquare",
        title: "Help & Support tickets reach us",
        description: "Tickets you send from Help & Support now land in a new Support Tickets inbox for the Kramasha team, who can reply and change the status. Replies appear under My Tickets and as a notification, so bugs, ideas and feedback no longer get lost.",
      },
    ],
  },
  {
    version: "1.1.6.1",
    date: "2026-10-06",
    notes: [
      {
        icon: "Receipt",
        title: "Unpaid invoices no longer show \u201CFully paid\u201D",
        description: "An invoice with no payment now shows the full amount due instead of Rs 0 due or Fully paid. This applies to the event page, the Invoices list, the invoice PDF and the client portal, and editing an invoice total keeps the balance right.",
      },
      {
        icon: "ShieldCheck",
        title: "Password on quotation and invoice links",
        description: "Quotation and invoice links ask for the client\u2019s portal password. Clients who open them from their signed-in portal go straight in. The quotation password box now only lights up when you change it.",
      },
      {
        icon: "Printer",
        title: "Better PDFs and preview",
        description: "The preview is now one \u201CPDF Preview\u201D dialog with the real A4 pages, Print and Download. The logo watermark repeats on every page, the big blank gaps are gone, Terms & Conditions use smaller text, and invoices use your business wording (Event, Project\u2026).",
      },
      {
        icon: "Eye",
        title: "Cleaner client pages",
        description: "The invoice page now lists Includes in its own block, like the quotation page. The generic Payment Method box is hidden when your bank details are shown, and the Save button only lights up when something has changed.",
      },
    ],
  },
  {
    version: "1.1.6",
    date: "2026-10-06",
    notes: [
      {
        icon: "Gift",
        title: "Includes / Deliverables on quotations",
        description: "Add what a package covers beyond the days — each item has its own quantity, price, optional note and an Add-on tick. They count in the total, show as their own section on the client link, the client portal, the quotation PDF and the invoice, and are saved with packages.",
      },
      {
        icon: "Wallet",
        title: "Payment status for your clients",
        description: "Milestones now show Paid, Partially paid or Pending on both the quotation page and the client portal. What the client has paid is divided across the milestones in order, and the event\u2019s Milestones tab follows the same rule.",
      },
      {
        icon: "CalendarDays",
        title: "Create the event when the client accepts",
        description: "When a quotation is accepted you are asked whether to create the event (or re-sync a linked one) before anything changes. The event gets the dates, total, team roles, services at the quoted rates and payment milestones, and keeps its own title.",
      },
      {
        icon: "Receipt",
        title: "Invoices that match your quotations",
        description: "Invoice numbers now follow the quotation number (QT-2026-0024 becomes INV-2026-0024). Invoices carry the Scope of Work, separate Payment Terms and Terms & Conditions, and can no longer be saved with a zero total. Editing a quotation or invoice number now actually saves.",
      },
      {
        icon: "Percent",
        title: "Your margin stays your business",
        description: "Type a manual subtotal and the discount (% or fixed) is worked out on it. Clients see Subtotal, Discount and Total — the round-off line is gone from every PDF and portal.",
      },
      {
        icon: "Printer",
        title: "Cleaner, safer PDFs",
        description: "The minimal black quotation and invoice have a fresh look, your logo, name and document number on every page, page numbers, contact icons in one tidy column, your tagline, and the exact booked dates. Text is no longer cut across pages, and notes, terms and long lists wrap properly. Team members show their role (and side) instead of names, and respect Hide team names.",
      },
      {
        icon: "Users",
        title: "Team sides and no double booking",
        description: "Team members show their side with the same colour tags as your team lists. Adding the same person twice on a day is blocked with an inline message. Job sheets list each member\u2019s dates and side, and work even before the quotation is accepted.",
      },
      {
        icon: "Eye",
        title: "Client pages that feel like one app",
        description: "The quotation and invoice pages now share the same logo, contact and address icons, payment card with a UPI QR, and terms cards. Wording follows your business (Event, Project, Appointment…), drafts are hidden from the client portal, and quotations there open with one tap.",
      },
      {
        icon: "ShieldCheck",
        title: "Cleaner inputs",
        description: "Social links must be real links for the right platform, account numbers accept digits only, and payment method is a dropdown. Finalized quotations keep their dates and values clearly readable, and your client\u2019s signature, name and acceptance time are kept as proof.",
      },
      {
        icon: "Sparkles",
        title: "Festive launch offer",
        description: "The pricing section on the landing page has a Navratri look, switching to Diwali, with launch prices shown against the regular ones.",
      },
      {
        icon: "Smartphone",
        title: "Small improvements",
        description: "Sort events by name or ID, your plan shows correctly in Preferences, Job Sheet and Add to Calendar match the other blue buttons, the reminder remove button is harder to tap by mistake, and the Update Now button is easier to read.",
      },
    ],
  },
  {
    version: "1.1.5",
    date: "2026-10-05",
    notes: [
      {
        icon: "BellRing",
        title: "Notification categories and working reminders",
        description: "Choose which notifications you want: events, payments, quotations, plan & billing. Reminders now follow your \u201cRemind me\u201d days and time, reach you as push even when the app is closed, and the Reminders bell on the Events page shows a red dot whenever something is listed (switch it off in Preferences).",
      },
      {
        icon: "Receipt",
        title: "Invoice creation from quotations fixed",
        description: "Creating an invoice from a quotation no longer fails or opens a blank invoice, and milestone invoices with a due date now work.",
      },
      {
        icon: "Smartphone",
        title: "Better previews and lists on phones",
        description: "Invoice and quotation previews now fit your screen and scroll smoothly. Long names in the Financial list end in \u2026 instead of being cut off. Preferences on desktop scrolls to the section you pick.",
      },
      {
        icon: "ListChecks",
        title: "Status tags that update themselves",
        description: "Events move from Upcoming to In Progress on their first date, and to Completed only once the dates have passed, the client has paid in full and every team member and service is paid. Event dots turn green on the same rule, and the owner\u2019s own share never holds them back. Statuses you set by hand are never changed.",
      },
      {
        icon: "BellRing",
        title: "Reminders from the moment you add an event",
        description: "Every event or project appears in Reminders as soon as it is added and stays until the client and all team and service dues are cleared. Tap the X on any reminder to remove it for good (you are asked first).",
      },
      {
        icon: "Receipt",
        title: "Misc income, and sharing from the Financial page",
        description: "Record misc money received as well as paid, and it counts in that financial year\u2019s totals. Share an invoice from any payment, or right after saving a misc entry. On mobile the row actions sit in a single three-dot menu.",
      },
      {
        icon: "Eye",
        title: "Client-facing options at the bottom of quotations",
        description: "Show or hide pricing and team names from one panel at the bottom of the quotation, at any time, even after it is finalized. The client link now shows the exact days you quoted for.",
      },
      {
        icon: "CalendarRange",
        title: "Client portal shows every day with its year",
        description: "Team and services are grouped by day, each as Day N with the full date including the year. Services follow the quotation: per day for day-wise quotations, one list for general ones.",
      },
      {
        icon: "Smartphone",
        title: "Faster saving and smoother mobile",
        description: "Saving payments and assignments is quicker. Number fields open the number keypad, the Team page stacks name above role on phones, Back no longer returns to the create screen after you save, the setup banner no longer flashes, and your custom event types always appear in Preferences.",
      },
    ],
  },
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
