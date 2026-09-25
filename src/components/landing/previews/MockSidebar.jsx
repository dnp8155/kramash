import React from "react";
import {
  LayoutDashboard, CalendarDays, Users, UserCheck,
  Wallet, UserPlus, ReceiptIndianRupee,
  FileText, SlidersHorizontal, Headphones,
} from "lucide-react";
import Logo from "@/components/common/Logo";

// Mirrors the real sidebar's groups, labels and icons — see src/constants/navigation.js.
const GROUPS = [
  {
    label: "Workspace",
    items: [
      { icon: LayoutDashboard, label: "Dashboard" },
      { icon: CalendarDays, label: "Events" },
      { icon: Users, label: "Clients" },
      { icon: UserCheck, label: "Team" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: Wallet, label: "Financial" },
      { icon: UserPlus, label: "Leads" },
      { icon: ReceiptIndianRupee, label: "Invoices" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: FileText, label: "Quotation & Agreement" },
    ],
  },
];

export default function MockSidebar({ active = "Dashboard", workspaceName = "Kramasha" }) {
  return (
    <div className="w-48 bg-[#0A0A0A] shrink-0 p-3 hidden sm:flex flex-col">
      <div className="flex items-center gap-2.5 px-2 py-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
          <Logo size={22} />
        </div>
        <span className="text-white text-xs font-bold truncate">{workspaceName}</span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-wider text-[#5A5650]">{group.label}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.label === active;
                return (
                  <div
                    key={item.label}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                      isActive ? "bg-white/10 text-white font-semibold" : "text-[#888] hover:text-white"
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[#C8A95E]" />}
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 pt-3 border-t border-[#1C1C1C]">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#888]">
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span>Preferences</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#888]">
          <Headphones className="w-3.5 h-3.5 shrink-0" />
          <span>Help & Support</span>
        </div>
      </div>
    </div>
  );
}
