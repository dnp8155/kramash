import React from "react";
import { Calendar, FileText, Receipt, Wallet, MapPin, CheckCircle2 } from "lucide-react";
import BrowserFrame from "./BrowserFrame";

export default function ClientPortalPreview() {
  const stats = [
    { label: "PROJECTS", value: "3", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "QUOTED", value: "₹1.8L", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "INVOICED", value: "₹1.2L", icon: Receipt, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "BALANCE DUE", value: "₹40K", icon: Wallet, color: "text-red-600", bg: "bg-red-50" },
  ];
  const projects = [
    { title: "Wedding — Rahul & Priya", date: "Oct 15–17", venue: "Udaipur", status: "Upcoming", statusColor: "text-blue-700 bg-blue-50" },
    { title: "Pre-Wedding — Ankit & Sneha", date: "Nov 5", venue: "Jaipur", status: "Completed", statusColor: "text-emerald-700 bg-emerald-50" },
  ];
  const payments = [
    { label: "Advance payment received", amount: "₹60,000" },
  ];

  return (
    <BrowserFrame url="www.kramasha.com">
      <div className="flex-1 p-5 bg-[#F5F3EF] overflow-hidden">
        <div className="mb-4">
          <div className="text-[10px] text-[#8A8580] uppercase tracking-wide">Client Portal</div>
          <div className="text-sm font-bold text-[#1A1A1A]">Welcome, Priya Sharma</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[#E8E3DB] bg-white p-2.5">
              <div className={`w-6 h-6 rounded-md ${s.bg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-3 h-3 ${s.color}`} strokeWidth={1.75} />
              </div>
              <div className="text-[8px] font-semibold text-[#8A8580] uppercase tracking-wide">{s.label}</div>
              <div className="text-sm font-bold text-[#1A1A1A] mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#E8E3DB] bg-white p-3.5 mb-3">
          <div className="text-xs font-semibold text-[#1A1A1A] mb-2.5">Your Projects</div>
          <div className="space-y-2.5">
            {projects.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#1A1A1A] truncate">{p.title}</div>
                  <div className="text-[9px] text-[#8A8580] mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{p.date}</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.venue}</span>
                  </div>
                </div>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${p.statusColor}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E3DB] bg-white p-3.5">
          <div className="text-xs font-semibold text-[#1A1A1A] mb-2">Payment History</div>
          {payments.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="text-[10px] text-[#1A1A1A]">{p.label}</div>
              <span className="text-[10px] font-semibold text-[#1A1A1A] ml-auto">{p.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
