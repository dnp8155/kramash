import React, { useLayoutEffect, useRef, useState } from "react";
import {
  LayoutDashboard, CalendarDays, Users, UserCheck, Wallet, UserPlus, ReceiptIndianRupee,
  FileText, Calculator, PenLine, SlidersHorizontal, Smartphone, Headphones,
  Search, Bot, Bell, Crown, LogOut, TrendingUp, ArrowRight, ChevronLeft,
} from "lucide-react";
import Logo from "@/components/common/Logo";

// A graphic in the style of the real desktop app (light sidebar, top header with centred
// search + assistant + bell, and the Dashboard page) — see Sidebar.jsx, TopHeader.jsx, Dashboard.jsx.
// It is laid out at a true desktop width and shrunk to whatever space the sign-in / sign-up page gives it.

const DESIGN_W = 840;
const DESIGN_H = 700;

// Light surfaces pinned here so the preview never turns dark with the user's theme; gold replaces the app's blue as the accent.
const LIGHT_TOKENS = {
  "--background": "40 43% 97%",
  "--foreground": "220 26% 14%",
  "--card": "0 0% 100%",
  "--primary": "43 47% 58%", // brand gold (#C8A95E), same accent as the other landing previews
  "--primary-foreground": "0 0% 100%",
  "--muted": "43 30% 95%",
  "--muted-foreground": "218 17% 35%",
  "--border": "40 25% 90%",
  "--success": "152 56% 38%",
  "--warning": "32 95% 44%",
  "--destructive": "0 72% 51%",
};

const GROUPS = [
  { label: "Workspace", items: [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: CalendarDays, label: "Events" },
    { icon: Users, label: "Clients" },
    { icon: UserCheck, label: "Team" },
  ] },
  { label: "Finance", items: [
    { icon: Wallet, label: "Financial" },
    { icon: UserPlus, label: "Leads" },
    { icon: ReceiptIndianRupee, label: "Invoices" },
  ] },
  { label: "Tools", items: [
    { icon: FileText, label: "Quotation & Agreement" },
    { icon: Calculator, label: "Rate Estimator" },
    { icon: PenLine, label: "Sign a PDF" },
  ] },
  { label: "Settings", items: [
    { icon: SlidersHorizontal, label: "Preferences" },
    { icon: Smartphone, label: "App & Updates" },
    { icon: Headphones, label: "Help & Support" },
  ] },
];

// Same sample content as the phone preview (MobilePreview.jsx) and the landing previews.
const STATS = [
  { label: "Revenue", value: "₹18.4L", sub: "+24%", icon: TrendingUp, dot: "bg-success", tone: "text-success" },
  { label: "Events", value: "7", sub: "this week", icon: CalendarDays, dot: "bg-primary", tone: "text-primary" },
  { label: "Outstanding", value: "₹2.1L", sub: "3 due", icon: Wallet, dot: "bg-warning", tone: "text-warning" },
  { label: "Active Leads", value: "42", sub: "+8 today", icon: Users, dot: "bg-destructive", tone: "text-destructive" },
];

const EVENTS = [
  { title: "Wedding — Rahul & Priya", date: "Oct 15-17", value: "₹1.2L" },
  { title: "Corporate — TechCorp", date: "Oct 22", value: "₹80K" },
  { title: "Pre-Wedding — Ankit & Sneha", date: "Nov 5", value: "₹45K" },
];

const TREND = [38, 52, 34, 66, 48, 78, 60, 92];
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function Sidebar() {
  return (
    <div className="w-[200px] shrink-0 flex flex-col bg-card text-foreground border-r border-border">
      <div className="px-3 py-3 flex items-center gap-2.5">
        <Logo size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight tracking-wide uppercase truncate">Kramasha</div>
          <div className="text-xs text-muted-foreground truncate">Workspace</div>
        </div>
        <div className="w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex-1 min-h-0 px-3 py-3 space-y-2.5 overflow-hidden">
        {GROUPS.map((g) => (
          <div key={g.label} className="space-y-0.5">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
            {g.items.map((it) => {
              const active = it.label === "Dashboard";
              return (
                <div
                  key={it.label}
                  className={`relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] ${
                    active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground font-medium"
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />}
                  <it.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="px-3 pt-3 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Your Business</div>
            <div className="text-xs text-muted-foreground truncate">you@business.com</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-full border border-border bg-card flex items-center justify-center gap-1.5 text-xs font-medium">
            <Crown className="w-3.5 h-3.5" /> Plan
          </div>
          <div className="flex-1 h-8 rounded-full border border-destructive/40 text-destructive flex items-center justify-center gap-1.5 text-xs font-medium">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="h-14 shrink-0 bg-card/80 border-b border-border shadow-sm flex items-center px-6">
      <div className="flex-1" />
      <div className="relative w-[300px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
        <div className="h-10 pl-10 rounded-lg bg-muted/60 border border-border text-sm text-muted-foreground flex items-center">Search</div>
      </div>
      <div className="flex-1 flex items-center justify-end gap-2">
        <div className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center"><Bot className="w-[18px] h-[18px]" /></div>
        <div className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center"><Bell className="w-[18px] h-[18px]" /></div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="flex-1 min-h-0 p-6 space-y-5 overflow-hidden">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80 mb-1.5">Overview</div>
          <div className="text-[1.625rem] font-bold tracking-tight leading-tight">Good morning</div>
          <div className="text-sm text-muted-foreground mt-1.5">Here’s what’s happening today</div>
        </div>
        <div className="h-9 px-3.5 rounded-full border border-border bg-card text-xs font-medium flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-primary" /> Financial Year
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-[15px] p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] truncate">{s.label}</div>
              <s.icon className={`w-3.5 h-3.5 ml-auto ${s.tone}`} strokeWidth={2} />
            </div>
            <div className="mt-3 text-[1.4rem] font-mono font-semibold tabular-nums leading-none tracking-tight">{s.value}</div>
            <div className="mt-2 text-xs text-muted-foreground truncate">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.15fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-[15px] shadow-card">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Upcoming Events</h3>
            </div>
            <span className="text-xs font-medium text-primary flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></span>
          </div>
          <div className="p-2 space-y-1">
            {EVENTS.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{e.date}</div>
                </div>
                <div className="text-[13px] font-mono font-semibold tabular-nums">{e.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[15px] shadow-card">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Revenue Trend</h3>
            </div>
            <span className="text-xs text-muted-foreground">This FY</span>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-2 h-[130px]">
              {TREND.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-primary/80" style={{ height: `${h}%`, opacity: 0.45 + (i / TREND.length) * 0.55 }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              {MONTHS.map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthDesktopPreview() {
  const hostRef = useRef(null);
  const [scale, setScale] = useState(0.46);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / DESIGN_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="relative w-full rounded-xl border border-[#E8E3DB] shadow-2xl overflow-hidden bg-white"
      style={{ height: DESIGN_H * scale }}
      aria-hidden="true"
    >
      <div
        className="absolute top-0 left-0 flex origin-top-left bg-background text-foreground"
        style={{ ...LIGHT_TOKENS, width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})` }}
      >
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <Dashboard />
        </div>
      </div>
    </div>
  );
}
