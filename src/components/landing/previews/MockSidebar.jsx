import React from "react";
import { LayoutDashboard, Users, FolderKanban, CalendarCheck, FileText, Wallet, Settings, LifeBuoy, LogOut } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function MockSidebar({ active = "Dashboard", workspaceName = "Kramasha Studio" }) {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: Users, label: "Leads" },
    { icon: FolderKanban, label: "Projects" },
    { icon: CalendarCheck, label: "Events" },
    { icon: FileText, label: "Quotations" },
    { icon: Wallet, label: "Finance" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-48 bg-[#0A0A0A] shrink-0 p-3 hidden sm:flex flex-col">
      <div className="flex items-center gap-2.5 px-2 py-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
          <Logo size={22} />
        </div>
        <span className="text-white text-xs font-bold truncate">{workspaceName}</span>
      </div>
      <div className="flex flex-col gap-0.5 flex-1">
        {items.map((item) => {
          const isActive = item.label === active;
          return (
            <div
              key={item.label}
              className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                isActive ? "bg-white/10 text-white font-semibold" : "text-[#888] hover:text-white"
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[#C8A95E]" />}
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-0.5 pt-3 border-t border-[#1C1C1C]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-[#888]">
          <LifeBuoy className="w-4 h-4 shrink-0" />
          <span>Help & Support</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-[#888]">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}