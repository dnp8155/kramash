import React from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarCheck,
  Wallet,
  FileText,
  Settings,
  LifeBuoy,
  LogOut,
} from "lucide-react";
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
    <div className="w-44 bg-[#0B2125] shrink-0 p-3 hidden sm:flex flex-col">
      {/* Workspace */}
      <div className="flex items-center gap-2.5 px-2 py-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
          <Logo size={22} />
        </div>
        <span className="text-white text-xs font-bold truncate">{workspaceName}</span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1">
        {items.map((item) => {
          const isActive = item.label === active;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                isActive
                  ? "bg-white text-[#0B2125] font-semibold"
                  : "text-[#8FA0A4] hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col gap-0.5 pt-3 border-t border-[#1A2F30]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-[#8FA0A4]">
          <LifeBuoy className="w-4 h-4 shrink-0" />
          <span>Help & Support</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-[#8FA0A4]">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}