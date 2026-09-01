import { useState } from "react";
import Card from "@/components/common/Card";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Users, UserCircle, Wallet,
  FileText, Receipt, Calculator, Settings, CreditCard,
  Smartphone, Share2, ChevronDown, ChevronUp, BookOpen,
  Rocket, ClipboardList, Bell, Palette, Shield
} from "lucide-react";

const CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    color: "text-primary",
    bg: "bg-primary/10",
    features: [
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
          "Choose a PDF template (Gold Premium, Navy Gold) and customize colors.",
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
          "Go to Settings → Workspace to edit business name, logo, address, and contact.",
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
        desc: "Use KRAMAS like a native app on your phone.",
        steps: [
          "Open the app in your phone's browser (Chrome / Safari).",
          "Tap the browser menu and select 'Add to Home Screen' or 'Install App'.",
          "Launch KRAMAS from your home screen — it runs full-screen like a native app.",
          "Works on both Android and iOS."
        ]
      },
      {
        icon: Smartphone,
        title: "Offline Mode",
        desc: "Keep working even without internet.",
        steps: [
          "KRAMAS caches your data locally when you're online.",
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

  const current = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="space-y-5">
      {/* Category selector — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setOpenFeature(null); }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Category header */}
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", current.bg)}>
          <current.icon className={cn("w-5 h-5", current.color)} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{current.label}</h3>
          <p className="text-xs text-muted-foreground">{current.features.length} guide{current.features.length > 1 ? "s" : ""} in this section</p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {current.features.map((feat, idx) => {
          const Icon = feat.icon;
          const globalIdx = `${current.id}-${idx}`;
          const isOpen = openFeature === globalIdx;
          return (
            <Card key={globalIdx} className="overflow-hidden">
              <button
                onClick={() => setOpenFeature(isOpen ? null : globalIdx)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", current.bg)}>
                  <Icon className={cn("w-4.5 h-4.5", current.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{feat.title}</h4>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{feat.desc}</p>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <ol className="space-y-2.5 mt-3">
                    {feat.steps.map((step, sIdx) => (
                      <li key={sIdx} className="flex gap-2.5 text-sm text-foreground">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5",
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
  );
}