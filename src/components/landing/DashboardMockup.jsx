import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  FileText,
  Globe,
  Clock,
} from "lucide-react";
import { STATUS_DOT } from "./categories";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CalendarDays, label: "Work" },
  { icon: Users, label: "Clients" },
  { icon: Users, label: "Team" },
  { icon: Wallet, label: "Financial" },
  { icon: FileText, label: "Quotations" },
];

function FloatingCard({ icon: Icon, label, value, tone }) {
  const tones = {
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-lg">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardMockup({ category }) {
  const { labels, items } = category;

  const stats = [
    { icon: Wallet, label: "Total Revenue", value: "₹82,450", tone: "text-success" },
    { icon: CalendarDays, label: labels.activeWork, value: "12", tone: "text-primary" },
    { icon: Users, label: labels.team, value: "8", tone: "text-info" },
    { icon: Clock, label: "Pending", value: "₹40K", tone: "text-warning" },
  ];

  return (
    <div className="relative">
      {/* Main app frame */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        {/* Browser bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto hidden items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1 text-xs text-muted-foreground sm:flex">
            <Globe className="h-3 w-3" /> app.kramashah.com/dashboard
          </div>
        </div>

        {/* App body */}
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border bg-muted/20 p-3 sm:block">
            <div className="mb-4 flex items-center gap-2 px-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                K
              </div>
              <span className="text-sm font-bold text-foreground">Kramashah</span>
            </div>
            {SIDEBAR_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Dashboard</h3>
                <p className="text-xs text-muted-foreground">Welcome back — here's what's happening.</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                A
              </div>
            </div>

            {/* Stat cards */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <div key={i} className="rounded-xl border border-border bg-white p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-muted ${stat.tone}`}>
                      <stat.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Work items list */}
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
                <span className="text-xs font-semibold text-foreground">Upcoming {labels.work}</span>
                <span className="text-[10px] font-medium text-primary">View all</span>
              </div>
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    i < items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-accent">
                    <span className="text-[8px] font-semibold uppercase text-muted-foreground">
                      {item.date.split(" ")[0]}
                    </span>
                    <span className="text-sm font-bold text-foreground">{item.date.split(" ")[1]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {labels.venue}: {item.venue}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                    <span className="text-[10px] font-medium text-muted-foreground">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards (desktop only) */}
      <div className="absolute -right-6 -top-6 hidden lg:block">
        <FloatingCard icon={Wallet} label="Payments Received" value="₹82,450" tone="success" />
      </div>
      <div className="absolute -left-8 top-1/3 hidden lg:block">
        <FloatingCard icon={Users} label="Team Available" value="8 / 12" tone="info" />
      </div>
      <div className="absolute -right-8 bottom-12 hidden lg:block">
        <FloatingCard icon={FileText} label="Quotation" value="Accepted" tone="primary" />
      </div>
    </div>
  );
}