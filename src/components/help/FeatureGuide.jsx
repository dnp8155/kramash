import { useState, useMemo } from "react";
import Card from "@/components/common/Card";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Users, UserCircle, Wallet,
  FileText, Receipt, Calculator, Settings, CreditCard,
  Smartphone, Share2, ChevronDown, ChevronUp, BookOpen,
  Rocket, ClipboardList, Bell, Palette, Shield, Search, X,
  Inbox, IdCard, HardDrive, BarChart3, MessageSquare
} from "lucide-react";

export const CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: Rocket,
        title: "How Kramasha Works",
        desc: "The whole flow, from first enquiry to final payment.",
        steps: [
          "Leads: add every enquiry and set a follow-up date. You get a reminder when it is due.",
          "Events / Projects: turn a won lead into work, then assign your team and services. Clashes are flagged.",
          "Quotation and Invoices: send a quotation for the client to review and sign, then an invoice from the same details.",
          "Financial: record payments against each event or milestone and see what is still pending.",
          "Setup checklist: on the Events page, finish the 4 short steps (business profile, team, services, types). Closed it? Preferences → Complete setup brings it back."
        ]
      },
      {
        icon: BookOpen,
        title: "Onboarding Setup",
        desc: "Set up your workspace when you first join.",
        steps: [
          "After login, you'll land on the Onboarding page.",
          "Enter your business name and select your business type (e.g. Photography, Event Management).",
          "Choose your business category — this locks your work labels (Event vs Project vs Assignment).",
          "Add your business email, phone, address, and GST details (optional).",
          "Click 'Create Workspace' — you're ready to go."
        ]
      },
      {
        icon: LayoutDashboard,
        title: "Dashboard Overview",
        desc: "Your command center for everything happening.",
        steps: [
          "The Dashboard shows key stats: total events, revenue, team wages due, and upcoming events.",
          "Use the Financial Year selector (top-right) to filter stats by FY.",
          "Widgets show team availability, outstanding dues, and upcoming events at a glance.",
          "Click any widget or stat card to jump to the relevant page."
        ]
      }
    ]
  },
  {
    id: "events",
    label: "Events / Work Items",
    icon: CalendarDays,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: CalendarDays,
        title: "Create a New Event",
        desc: "Add a new project, event, or work item.",
        steps: [
          "Go to Events page and click 'New Event'.",
          "Select or create a client for this event.",
          "Enter the event title, type, start date, and venue.",
          "For multi-day or non-consecutive events, add all event dates using the date picker.",
          "Set the contract value and assign team members if ready.",
          "Click 'Create Event' — it appears on your dashboard instantly."
        ]
      },
      {
        icon: ClipboardList,
        title: "Event Details — 6 Tabs",
        desc: "Manage everything about a single event.",
        steps: [
          "Overview: View event info, client details, dates, venue, and contract value.",
          "Team: Assign team members with per-member booking dates and rates. Conflicts are auto-checked.",
          "Financials: See 6 summary cards (Package, Received, Balance, Team Cost, Expenses, Profit), plus quotations and invoices.",
          "Payments: Record client receipts and team payments. View full payment history.",
          "Progress: Track day-by-day status (planned → confirmed → done).",
          "Notes: Add internal notes and descriptions for your team."
        ]
      },
      {
        icon: Share2,
        title: "Share Event Tracking Link",
        desc: "Let clients track their event progress live.",
        steps: [
          "Open the event and click 'Share Link' in the header.",
          "Copy the tracking link and send it to your client.",
          "Your client opens the link — no login needed — and sees live event status, dates, and team."
        ]
      }
    ]
  },
  {
    id: "clients",
    label: "Clients",
    icon: UserCircle,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: UserCircle,
        title: "Manage Clients",
        desc: "Create and track all your clients in one place.",
        steps: [
          "Go to Clients page and click 'New Client'.",
          "Enter name, phone, alternate phone, email, and address.",
          "City auto-fills state and country for Indian cities.",
          "Open any client to see their 360° financial summary and all related events."
        ]
      }
    ]
  },
  {
    id: "team",
    label: "Team Management",
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: Users,
        title: "Add & Manage Team Members",
        desc: "Build your team with roles and rates.",
        steps: [
          "Go to Team page and click 'Add Team Member'.",
          "Enter name, phone, email, profession, and default rate.",
          "Choose rate type: Per Event, Per Day, or Fixed.",
          "Assign a role (e.g. Lead Photographer, Editor) and member type (e.g. Bride Side / Groom Side).",
          "Open any member to see their bookings, earnings, and payment status."
        ]
      },
      {
        icon: CalendarDays,
        title: "Availability Calendar",
        desc: "See who's booked, available, or on leave.",
        steps: [
          "The Team page shows a monthly availability calendar.",
          "Green = available, amber = booked, red = blocked/leave.",
          "Click a day to see all members' status and bookings for that date.",
          "Assignments with non-consecutive dates and per-member booking ranges are shown accurately."
        ]
      },
      {
        icon: Bell,
        title: "Block Dates (Leave)",
        desc: "Mark team members unavailable for specific dates.",
        steps: [
          "Open a team member's details page.",
          "Click 'Block Dates' and select the leave date range.",
          "Add a reason (e.g. 'Personal leave', 'Sick').",
          "Blocked members won't be assignable to events during those dates."
        ]
      }
    ]
  },
  {
    id: "financial",
    label: "Financial Management",
    icon: Wallet,
    color: "text-success",
    bg: "bg-success/10",
    features: [
      {
        icon: Wallet,
        title: "Record Payments & Expenses",
        desc: "Track every rupee in and out.",
        steps: [
          "From any event's Financial tab, click 'Record Payment' (client receipt) or 'Record Expense'.",
          "For team payments, open a team assignment and click the payment icon.",
          "Choose payment method (Cash, UPI, Bank Transfer, Cheque) and enter the amount.",
          "All transactions sync to the Financial page and client/member summaries automatically."
        ]
      },
      {
        icon: CalendarDays,
        title: "Financial Years",
        desc: "Organize your books by fiscal year.",
        steps: [
          "Go to Financial page → Financial Years tab.",
          "Create FY records (e.g. FY2026-27) with start and end dates.",
          "Mark one FY as active — it's used for dashboard filtering.",
          "Events auto-map to the correct FY based on their start date."
        ]
      },
      {
        icon: Receipt,
        title: "Share a Receipt",
        desc: "Send a payment receipt to your client.",
        steps: [
          "On the Financial page (or an event's Payments tab), open the ⋮ menu on a payment and choose Share Receipt.",
          "Choose whether your logo shows on this receipt (the logo is a Pro feature). The starting choice is set in Preferences → Shared Logo.",
          "Share the receipt as an image through your phone's share sheet, or download it."
        ]
      },
      {
        icon: BarChart3,
        title: "Reports (including Leads & GST)",
        desc: "Seven views of your books for the financial year you pick.",
        steps: [
          "Go to Financial → Reports and pick the financial year at the top.",
          "Choose Overview, Expenses, By event, Clients, Team, Leads or GST. On a phone, swipe the tab row to see them all.",
          "Leads shows how many enquiries you got, how many were won, your conversion rate, results by source and why leads were lost.",
          "GST adds up the GST on invoices you issued (not drafts or cancelled ones) by month: taxable value, CGST, SGST and IGST. Check it with your accountant before filing.",
          "Tap Export to Excel to download the report you are viewing (an Excel export may need Pro)."
        ]
      },
      {
        icon: Wallet,
        title: "Receivables & Dues",
        desc: "See who owes you and what you owe.",
        steps: [
          "Financial page shows Outstanding Receivables (clients who haven't paid).",
          "Team Wages Due shows pending team payments.",
          "Click any item to jump to the event or member and record a payment."
        ]
      }
    ]
  },
  {
    id: "quotes-invoices",
    label: "Quotations & Invoices",
    icon: FileText,
    color: "text-warning",
    bg: "bg-warning/10",
    features: [
      {
        icon: Calculator,
        title: "Rate Estimator",
        desc: "Quickly build a cost estimate before quoting.",
        steps: [
          "Go to Rate Estimator page.",
          "Select team roles and services from your workspace catalog.",
          "Adjust quantities and add a profit markup percentage.",
          "See the total estimated cost in real-time.",
          "Click 'Create Quotation' to turn the estimate into a formal quote."
        ]
      },
      {
        icon: FileText,
        title: "Create a Quotation",
        desc: "Build and send professional quotes to clients.",
        steps: [
          "Go to Quotations page and click 'New Quotation'.",
          "Select the event and client (auto-filled from the event).",
          "Add items: services, team roles, or custom line items.",
          "Set quantity, days, and rate per item. GST is auto-calculated if enabled.",
          "Apply discount (percent or fixed) and review the grand total.",
          "Choose a PDF template (Modern Style, Classic Minimal or Custom) and set your accent colour.",
          "Click 'Finalize', then 'Share Link' — your client gets a password-protected link to view and sign online."
        ]
      },
      {
        icon: Share2,
        title: "Client Online Signing",
        desc: "Clients sign quotations digitally — no login needed.",
        steps: [
          "After finalizing a quotation, click 'Share Link' and copy the URL.",
          "Optionally set an access password for extra security.",
          "Your client opens the link, reviews the quote, draws their signature, and clicks 'Accept'.",
          "The signed quotation status updates to 'Accepted' in your app automatically."
        ]
      },
      {
        icon: Receipt,
        title: "Create an Invoice",
        desc: "Generate invoices after a quotation is accepted.",
        steps: [
          "From an accepted quotation or the Invoices page, click 'New Invoice'.",
          "Select the event and client. You can pull items from the accepted quotation.",
          "Add packages (with nested events) or simple line items.",
          "Set invoice date, due date, and payment schedule if needed.",
          "Save as draft, then mark 'Sent' when you email it to the client.",
          "Use 'Print / Download' for a professional branded PDF."
        ]
      },
      {
        icon: Receipt,
        title: "Invoice Payment Tracking",
        desc: "Track partial and full payments per invoice.",
        steps: [
          "Open any invoice to see subtotal, GST, grand total, and amount paid.",
          "Record payments against the invoice — status auto-updates (draft → sent → partial → paid).",
          "Balance due is calculated automatically.",
          "From Event Details → Financials tab, see all invoices with quick actions (View, Copy, Link, Print, Edit, Delete)."
        ]
      }
    ]
  },
  {
    id: "leads-profile",
    label: "Leads & My Profile",
    icon: Inbox,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: Inbox,
        title: "Track Leads",
        desc: "Follow every enquiry until it becomes a client.",
        steps: [
          "Open Leads and add an enquiry with its name, contact, type of work, date and budget. Free allows 50 leads; Pro is unlimited.",
          "Move it through New, Contacted, Qualified, Negotiation, Won or Lost. When you mark one Lost, pick a reason.",
          "Set a follow-up date, and use the ready-made messages to reply on WhatsApp.",
          "When a lead confirms, convert it into a client and an event in one step.",
          "See your conversion rate in the Insights view, or in Financial → Reports → Leads."
        ]
      },
      {
        icon: IdCard,
        title: "Set Up My Profile",
        desc: "Your own shareable page, such as kramasha.com/p/your-name.",
        steps: [
          "Open My Profile from the menu. Choose your link, then switch on Publish. The link is locked once you save it published, so choose it carefully.",
          "Add your logo (a Pro feature), a short About, and your social links. The folded Social links card tells you how many links and custom links you added.",
          "Add sections: videos (up to 4), services, testimonials (up to 6), links, text, FAQs (up to 8) and a map (1). Name, reorder or hide each one. The header shows how many items you have used.",
          "Under Show on your profile, choose which contact details visitors can see. Hidden details are not sent to visitors at all.",
          "Tap Save, then View to open your page. Use the share icon in its top-right corner to send it."
        ]
      },
      {
        icon: MessageSquare,
        title: "Inquiry Form on Your Profile",
        desc: "Let visitors send you an enquiry straight from your page.",
        steps: [
          "In My Profile, open Inquiry form and switch on Show inquiry form, then Save. Your profile must be published.",
          "Visitors send their name, phone or email, type of work, one day or up to 15 days, and a message.",
          "It lands in Leads as a new Website lead. You get a bell notification, and on Pro a push alert on your phone.",
          "Inquiries count toward your lead limit (50 on Free). The panel shows how many you have used, and visitors are asked to contact you directly once it is full.",
          "Spam protection is built in and stays out of the way: real visitors almost never see a check."
        ]
      }
    ]
  },
  {
    id: "storage",
    label: "Storage",
    icon: HardDrive,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: HardDrive,
        title: "Note Where Your Files Are",
        desc: "Keep track of which drive holds each job's files. Nothing is uploaded.",
        steps: [
          "Open Storage and tap Add drive. Give it a name, then pick a type from the list or type your own (for example LTO tape).",
          "Choose a colour and add an optional note, such as where it is kept.",
          "Open any job's Storage tab and note which drive and folder its files are in, and whether it is the original, a backup or the final version.",
          "Use Needs backup on the Storage page to list jobs that have only one copy.",
          "You can switch the Storage tab off on the Storage page; nothing you saved is lost."
        ]
      }
    ]
  },
  {
    id: "settings-plan",
    label: "Settings & Plan",
    icon: Settings,
    color: "text-muted-foreground",
    bg: "bg-muted",
    features: [
      {
        icon: Settings,
        title: "Workspace Settings",
        desc: "Configure your business profile and GST.",
        steps: [
          "Go to Settings → Workspace to edit business name, address, and contact. Your logo now lives on My Profile.",
          "Enable GST and enter your GSTIN, registered business name, and billing address.",
          "Set the default GST rate — applied to new quotations and invoices automatically.",
          "Note: Business type is locked after onboarding for data consistency."
        ]
      },
      {
        icon: Palette,
        title: "Appearance & Preferences",
        desc: "Customize how the app looks and behaves.",
        steps: [
          "Settings → Appearance: Choose light or dark theme.",
          "Settings → Notifications: Toggle event reminders and payment alerts.",
          "Preferences page: Manage team member types (e.g. Bride Side / Groom Side) and display options.",
          "Changes save automatically and apply across the app."
        ]
      },
      {
        icon: Shield,
        title: "Profile & Session",
        desc: "Manage your account and security.",
        steps: [
          "Settings → Profile: Update your name and contact details.",
          "Settings → Session: View active sessions and log out remotely.",
          "Use a strong password. You can reset it from the login page if forgotten."
        ]
      },
      {
        icon: CreditCard,
        title: "Your Plan & Upgrade",
        desc: "Manage your subscription.",
        steps: [
          "Go to Your Plan page to see your current plan (Free or Pro) and usage.",
          "Click 'Upgrade to Pro' to unlock unlimited events, team members, and premium features.",
          "Choose a billing cycle (Monthly, 6-Month, Annual) and complete payment.",
          "Your plan upgrades instantly. You can downgrade anytime from the same page."
        ]
      }
    ]
  },
  {
    id: "pwa",
    label: "Mobile & Offline",
    icon: Smartphone,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
      {
        icon: Smartphone,
        title: "Install as an App",
        desc: "Use Kramasha like a native app on your phone.",
        steps: [
          "Open the app in your phone's browser (Chrome / Safari).",
          "Tap the browser menu and select 'Add to Home Screen' or 'Install App'.",
          "Launch Kramasha from your home screen — it runs full-screen like a native app.",
          "Works on both Android and iOS."
        ]
      },
      {
        icon: Smartphone,
        title: "Offline Mode",
        desc: "Keep working even without internet.",
        steps: [
          "Kramasha caches your data locally when you're online.",
          "If you lose connection, you'll see an 'Offline' banner but can still view cached data.",
          "Any changes you make offline are queued and sync automatically when you reconnect.",
          "If you try to load a page that isn't cached, you'll see a friendly offline page with a retry button."
        ]
      }
    ]
  }
];

export default function FeatureGuide() {
  const [openFeature, setOpenFeature] = useState(null);
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results = [];
    CATEGORIES.forEach((cat) => {
      cat.features.forEach((feat) => {
        if (
          feat.title.toLowerCase().includes(q) ||
          feat.desc.toLowerCase().includes(q) ||
          feat.steps.some((s) => s.toLowerCase().includes(q))
        ) {
          results.push({ ...feat, categoryLabel: cat.label, categoryBg: cat.bg, categoryColor: cat.color });
        }
      });
    });
    return results;
  }, [search]);

  const current = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="space-y-5">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          data-page-search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search features — try 'invoice', 'team', 'GST'..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {searchResults ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
          </p>
          {searchResults.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No features found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {searchResults.map((feat, idx) => {
                const Icon = feat.icon;
                const isOpen = openFeature === `search-${idx}`;
                return (
                  <Card key={`search-${idx}`} className={cn("group overflow-hidden transition-all", isOpen && "sm:col-span-2 xl:col-span-3 ring-1 ring-primary/30")}>
                    <button
                      onClick={() => setOpenFeature(isOpen ? null : `search-${idx}`)}
                      className="w-full flex flex-col gap-3 p-5 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", feat.categoryBg)}>
                          <Icon className={cn("w-5 h-5", feat.categoryColor)} />
                        </div>
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-muted-foreground"
                        )}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">{feat.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{feat.desc}</p>
                        <span className="inline-block mt-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{feat.categoryLabel}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-border bg-muted/20">
                        <ol className="space-y-3 mt-4">
                          {feat.steps.map((step, sIdx) => (
                            <li key={sIdx} className="flex gap-3 text-sm text-foreground">
                              <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", feat.categoryBg, feat.categoryColor)}>
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5">
          <aside className="lg:w-60 shrink-0">
            <div className="lg:sticky lg:top-4 space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setOpenFeature(null); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{cat.label}</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {cat.features.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3 pb-1">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", current.bg)}>
                <current.icon className={cn("w-5 h-5", current.color)} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{current.label}</h3>
                <p className="text-xs text-muted-foreground">{current.features.length} guide{current.features.length > 1 ? "s" : ""} • click any card to see steps</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {current.features.map((feat, idx) => {
                const Icon = feat.icon;
                const globalIdx = `${current.id}-${idx}`;
                const isOpen = openFeature === globalIdx;
                return (
                  <Card
                    key={globalIdx}
                    className={cn(
                      "group overflow-hidden transition-all cursor-pointer",
                      isOpen && "sm:col-span-2 xl:col-span-3 ring-1 ring-primary/30"
                    )}
                  >
                    <button
                      onClick={() => setOpenFeature(isOpen ? null : globalIdx)}
                      className="w-full flex flex-col gap-3 p-5 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", current.bg)}>
                          <Icon className={cn("w-5 h-5", current.color)} />
                        </div>
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-muted-foreground"
                        )}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">{feat.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{feat.desc}</p>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-medium pt-1 transition-colors",
                        isOpen ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {isOpen ? (
                          <>Hide steps <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>View {feat.steps.length} steps <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-border bg-muted/20">
                        <ol className="space-y-3 mt-4">
                          {feat.steps.map((step, sIdx) => (
                            <li key={sIdx} className="flex gap-3 text-sm text-foreground">
                              <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                current.bg, current.color
                              )}>
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}