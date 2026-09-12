import React from "react";
import {
  Users, Contact, CalendarCheck, UserCog, Briefcase, Calendar, Clock,
  FileText, Package, PenTool, Receipt, Target, Wallet, ExternalLink,
  BarChart3, Calculator, TrendingUp, ClipboardList, FileDown, DollarSign, Smartphone,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";

const GROUPS = [
  {
    name: "CAPTURE",
    features: [
      { icon: Users, name: "Lead Management", desc: "Capture enquiries and convert leads into clients." },
      { icon: Contact, name: "Client Management", desc: "Manage client details, communication and project info." },
    ],
  },
  {
    name: "PLAN",
    features: [
      { icon: CalendarCheck, name: "Event / Project Management", desc: "Create events, manage dates, status, venue and details." },
      { icon: UserCog, name: "Team Management", desc: "Manage team members, roles, assignments and dates." },
      { icon: Briefcase, name: "Service Management", desc: "Manage services, providers, rates and add-ons." },
      { icon: Calendar, name: "Calendar", desc: "See events, team schedules and availability." },
      { icon: Clock, name: "Availability", desc: "Avoid double-booking team members and providers." },
    ],
  },
  {
    name: "SELL",
    features: [
      { icon: FileText, name: "Quotations", desc: "Create professional quotations and packages." },
      { icon: Package, name: "Packages", desc: "Create reusable service/package templates." },
      { icon: PenTool, name: "Client E-Sign", desc: "Let clients review and digitally accept quotations." },
      { icon: Receipt, name: "Invoices", desc: "Generate full or milestone invoices." },
    ],
  },
  {
    name: "GET PAID",
    features: [
      { icon: Target, name: "Payment Milestones", desc: "Track advance, event-day and final payment schedules." },
      { icon: Wallet, name: "Payments", desc: "Track received payments, balances and history." },
      { icon: ExternalLink, name: "Client Project Portal", desc: "Give clients a clean place to view everything." },
    ],
  },
  {
    name: "RUN",
    features: [
      { icon: BarChart3, name: "Financials", desc: "Track income, expenses, profit/loss and owner share." },
      { icon: Calculator, name: "Miscellaneous Expenses", desc: "Track rent, electricity, software, EMI, food, travel." },
      { icon: TrendingUp, name: "Reports & Insights", desc: "Understand business performance and activity." },
      { icon: ClipboardList, name: "Job Sheets", desc: "Create operational job sheets for teams." },
    ],
  },
  {
    name: "WORK ANYWHERE",
    features: [
      { icon: FileDown, name: "PDF Documents", desc: "Generate quotation, invoice, receipt and job-sheet PDFs." },
      { icon: FileText, name: "Terms Templates", desc: "Save reusable Terms & Conditions." },
      { icon: DollarSign, name: "GST & Currency", desc: "Configured currencies with INR-specific GST handling." },
      { icon: Smartphone, name: "PWA / Mobile", desc: "Manage the business from mobile and desktop." },
    ],
  },
];

export default function FeatureGroups() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Everything You Need</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 leading-tight">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-[#888] text-base sm:text-lg leading-relaxed">
            From the first enquiry to final payment, Kramashah keeps your entire workflow connected.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GROUPS.map((group, gi) => (
            <Reveal key={group.name} delay={gi * 50}>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-6 h-full">
                <div className="text-xs font-bold tracking-wider text-[#C8A95E] mb-5">{group.name}</div>
                <div className="space-y-5">
                  {group.features.map((f) => (
                    <div key={f.name} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center shrink-0">
                        <f.icon className="w-4 h-4 text-[#C8A95E]" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white mb-0.5">{f.name}</div>
                        <div className="text-xs text-[#888] leading-relaxed">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}