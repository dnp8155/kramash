import React from "react";
import { LayoutGrid, Calendar, Users, User, Wallet, FileText, Search, Check } from "lucide-react";
import Logo from "@/components/common/Logo";

const projects = [
  { name: "Residence Renovation", client: "Sharma Studios", date: "Aug 12", status: "In Progress", tagClass: "bg-amber-100 text-amber-700" },
  { name: "Wedding Coverage – Mehra", client: "Mehra Family", date: "Sep 18", status: "Upcoming", tagClass: "bg-blue-100 text-blue-700" },
  { name: "Corporate Summit 2026", client: "TechCorp India", date: "Jul 28", status: "Completed", tagClass: "bg-emerald-100 text-emerald-700" },
  { name: "Brand Film Project", client: "Lumen Agency", date: "Aug 05", status: "In Progress", tagClass: "bg-amber-100 text-amber-700" },
];

const navItems = [
  { icon: LayoutGrid },
  { icon: Calendar, active: true },
  { icon: Users },
  { icon: User },
  { icon: Wallet },
  { icon: FileText },
];

export default function LoginPreview() {
  return (
    <div className="hidden lg:flex h-full w-full bg-white">
      {/* Mini sidebar */}
      <div className="w-16 bg-[#1A1D21] flex flex-col items-center py-5 gap-1">
        <div className="mb-4">
          <Logo size={32} className="rounded-lg" />
        </div>
        {navItems.map((item, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              item.active ? "bg-white/10 text-white" : "text-white/40"
            }`}
          >
            <item.icon className="w-5 h-5" strokeWidth={2} />
          </div>
        ))}
        <div className="mt-auto w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
          AS
        </div>
      </div>

      {/* Main preview area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase">Workspace</p>
            <h2 className="text-xl font-bold text-[#1A1D21] mt-0.5">Projects</h2>
          </div>
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 space-y-2.5 overflow-hidden">
          {projects.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                <div className="w-4 h-4 rounded bg-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1D21] truncate">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{p.client}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 mb-1">{p.date}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${p.tagClass}`}>
                  {p.status === "Completed" && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase">This Month</p>
            <p className="text-sm font-bold text-[#1A1D21] mt-0.5">Received ₹84,200</p>
          </div>
          <div className="flex items-end gap-1 h-8">
            <div className="w-1.5 h-3 rounded-sm bg-blue-200" />
            <div className="w-1.5 h-5 rounded-sm bg-blue-300" />
            <div className="w-1.5 h-7 rounded-sm bg-blue-400" />
            <div className="w-1.5 h-4 rounded-sm bg-blue-300" />
            <div className="w-1.5 h-6 rounded-sm bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}