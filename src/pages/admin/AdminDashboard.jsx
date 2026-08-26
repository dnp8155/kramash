import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Building2, Crown, CheckCircle2, XCircle, Users, TrendingUp,
  IndianRupee, ArrowRight, Sparkles, Filter, Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, Bar, Line, Legend
} from "recharts";
import LoadingState from "@/components/common/LoadingState";
import { StatGridSkeleton, ChartSkeleton } from "@/components/common/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = {
  PHOTOGRAPHY: "Photography",
  EVENT_MANAGEMENT: "Event Management",
  ARCHITECTURE: "Architecture",
  OTHER: "Other",
};

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function moneyShort(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function dateShort(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

export default function AdminDashboard() {
  const { data: stats, isLoading: loading, error } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => (await base44.functions.invoke("adminDashboardStats", {})).data,
    staleTime: 30 * 1000,
  });

  if (loading && !stats) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of workspaces, subscriptions, and revenue</p>
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <StatGridSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
  if (error && !stats) return <div className="p-6 text-sm text-destructive">{error?.message || "Failed to load stats"}</div>;
  if (!stats) return null;

  // Growth trend (this month vs last month)
  const growthMonths = stats.monthly_growth || [];
  const lastMonth = growthMonths[growthMonths.length - 1]?.count || 0;
  const prevMonth = growthMonths[growthMonths.length - 2]?.count || 0;
  const growthTrend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : (lastMonth > 0 ? 100 : 0);

  const revMonths = stats.monthly_revenue || [];
  const lastRev = revMonths[revMonths.length - 1]?.amount || 0;
  const prevRev = revMonths[revMonths.length - 2]?.amount || 0;
  const revTrend = prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : (lastRev > 0 ? 100 : 0);

  const eventMonths = stats.monthly_active_events || [];
  const perfData = revMonths.map((m) => {
    const ev = eventMonths.find((e) => e.key === m.key) || { count: 0 };
    return { label: m.label, revenue: m.amount, events: ev.count };
  });
  const lastEvents = eventMonths[eventMonths.length - 1]?.count || 0;
  const prevEvents = eventMonths[eventMonths.length - 2]?.count || 0;
  const eventTrend = prevEvents > 0 ? Math.round(((lastEvents - prevEvents) / prevEvents) * 100) : (lastEvents > 0 ? 100 : 0);

  const kpis = [
    {
      label: "Total Workspaces", value: stats.total_workspaces, icon: Building2,
      tone: "bg-primary/10 text-primary",
      sub: `${stats.suspended_workspaces} suspended`,
      trend: growthTrend, trendUp: growthTrend >= 0,
    },
    {
      label: "Pro Workspaces", value: stats.pro_workspaces, icon: Crown,
      tone: "bg-amber-100 text-amber-600",
      sub: `${stats.active_pro} active · ${stats.expired_pro} expired`,
    },
    {
      label: "Total Users", value: stats.total_users, icon: Users,
      tone: "bg-blue-100 text-blue-600",
      sub: `${stats.conversion_rate}% conversion to Pro`,
    },
    {
      label: "Revenue Collected", value: moneyShort(stats.total_revenue), icon: IndianRupee,
      tone: "bg-success/10 text-success",
      sub: `ARPU ${money(stats.arpu)} · ${stats.recent_payments?.length || 0} payments`,
      trend: revTrend, trendUp: revTrend >= 0,
    },
  ];

  const maxGrowth = Math.max(...growthMonths.map((m) => m.count), 1);
  const totalCat = Object.values(stats.category_distribution || {}).reduce((s, n) => s + n, 0) || 1;
  const catEntries = Object.entries(stats.category_distribution || {}).sort((a, b) => b[1] - a[1]);

  // Funnel stages
  const funnel = [
    { label: "Total Workspaces", value: stats.total_workspaces, color: "bg-primary", width: 100 },
    { label: "Pro Subscribed", value: stats.pro_workspaces, color: "bg-amber-500", width: stats.total_workspaces ? (stats.pro_workspaces / stats.total_workspaces) * 100 : 0 },
    { label: "Active Pro", value: stats.active_pro, color: "bg-success", width: stats.total_workspaces ? (stats.active_pro / stats.total_workspaces) * 100 : 0 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of workspaces, subscriptions, and revenue</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors">
            Manage Workspaces <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link to="/admin/plans" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
            Plans & Pricing
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.tone)}>
                  <Icon className="w-5 h-5" />
                </div>
                {typeof c.trend === "number" && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    c.trendUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    <TrendingUp className={cn("w-3 h-3", !c.trendUp && "rotate-180")} />
                    {c.trendUp ? "+" : ""}{c.trend}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold mt-3 text-foreground">{c.value}</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{c.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Business performance — revenue + active events combined */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Business Performance (6 months)</h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-success" /> Revenue
              <span className={cn("ml-1 font-semibold", eventTrend >= 0 ? "text-success" : "text-destructive")}>
                {eventTrend >= 0 ? "+" : ""}{eventTrend}% MoM
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Active Events
              <span className={cn("ml-1 font-semibold", eventTrend >= 0 ? "text-success" : "text-destructive")}>
                {eventTrend >= 0 ? "+" : ""}{eventTrend}% MoM
              </span>
            </span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={perfData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="perfRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={moneyShort} />
              <YAxis yAxisId="ev" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => name === "Revenue" ? [money(v), name] : [v, "Active Events"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="ev" dataKey="events" name="Active Events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={22} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#perfRevGrad)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-success" />
              <h2 className="text-sm font-semibold text-foreground">Revenue Trend (6 months)</h2>
            </div>
            <span className="text-xs text-muted-foreground">Total: {money(stats.total_revenue)}</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revMonths} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={moneyShort} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [money(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
          </div>
          <div className="space-y-3">
            {funnel.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{f.label}</span>
                  <span className="text-muted-foreground">{f.value}</span>
                </div>
                <div className="h-7 bg-muted rounded-md overflow-hidden">
                  <div
                    className={cn("h-full rounded-md flex items-center justify-end px-2 transition-all", f.color)}
                    style={{ width: `${Math.max(f.width, f.value > 0 ? 12 : 0)}%` }}
                  >
                    {f.value > 0 && <span className="text-[10px] font-semibold text-white">{Math.round(f.width)}%</span>}
                  </div>
                </div>
                {i < funnel.length - 1 && (
                  <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                    {funnel[i + 1].value} of {f.value} → {f.value > 0 ? Math.round((funnel[i + 1].value / f.value) * 100) : 0}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Workspace growth chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Workspace Growth (6 months)</h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-40">
            {growthMonths.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-foreground">{m.count}</div>
                <div className="w-full bg-muted rounded-t-md overflow-hidden flex items-end" style={{ height: "120px" }}>
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${(m.count / maxGrowth) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Plan Distribution</h2>
          </div>
          <div className="space-y-3">
            <PlanBar label="Free" value={stats.free_workspaces} total={stats.total_workspaces} color="bg-muted-foreground" />
            <PlanBar label="Active Pro" value={stats.active_pro} total={stats.total_workspaces} color="bg-success" />
            <PlanBar label="Expired Pro" value={stats.expired_pro} total={stats.total_workspaces} color="bg-destructive" />
            <PlanBar label="Suspended" value={stats.suspended_workspaces} total={stats.total_workspaces} color="bg-amber-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent workspaces */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Workspaces</h2>
            <Link to="/admin/workspaces" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground bg-muted/30">
                  <th className="px-5 py-2.5 font-medium">Workspace</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Plan</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-3 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_workspaces.map((ws) => (
                  <tr key={ws.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground truncate max-w-[180px]">{ws.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{ws.owner_email}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{CATEGORY_LABELS[ws.business_category] || ws.business_category}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                        ws.plan === "PRO" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                      )}>
                        {ws.plan === "PRO" && <Crown className="w-3 h-3" />}
                        {ws.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{dateShort(ws.created_date)}</td>
                    <td className="px-3 py-3 text-right">
                      <Link to={`/admin/workspaces/${ws.id}`} className="text-xs text-primary hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Business categories */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">By Business Category</h2>
          <div className="space-y-3">
            {catEntries.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(count / totalCat) * 100}%` }} />
                </div>
              </div>
            ))}
            {catEntries.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
          </div>
        </div>
      </div>

      {/* Recent payments */}
      {stats.recent_payments?.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Zap className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground bg-muted/30">
                  <th className="px-5 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Gateway</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-foreground">{money(p.amount)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground capitalize">{p.gateway}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-success/10 text-success">
                        <CheckCircle2 className="w-3 h-3" /> {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{dateShort(p.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{value} · {pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}