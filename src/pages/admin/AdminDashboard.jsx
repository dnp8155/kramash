import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Building2, Crown, Users, Receipt, TrendingUp, ArrowRight,
  BarChart3, Filter, Activity, LayoutDashboard, Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart
} from "recharts";
import { StatGridSkeleton, ChartSkeleton } from "@/components/common/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import AdminRecentActivity from "@/components/admin/AdminRecentActivity";
import AdminFunnel from "@/components/admin/AdminFunnel";
import AdminOverviewPanel from "@/components/admin/AdminOverviewPanel";

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function moneyShort(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => (await base44.functions.invoke("adminDashboardStats", {})).data,
    staleTime: 30 * 1000,
  });

  if (loading && !stats) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <StatGridSkeleton count={4} />
      <ChartSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartSkeleton />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );

  if (error && !stats) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-destructive mb-3">Unable to load this data.</p>
        <button onClick={() => refetch()} className="text-sm text-primary hover:underline">Retry</button>
      </div>
    </div>
  );

  if (!stats) return null;

  // Real trend calculations — only show trend when previous month data exists
  const growthMonths = stats.monthly_growth || [];
  const lastMonth = growthMonths[growthMonths.length - 1]?.count || 0;
  const prevMonth = growthMonths[growthMonths.length - 2]?.count || 0;
  const growthTrend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : null;

  const revMonths = stats.monthly_revenue || [];
  const lastRev = revMonths[revMonths.length - 1]?.amount || 0;
  const prevRev = revMonths[revMonths.length - 2]?.amount || 0;
  const revTrend = prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : null;

  const eventMonths = stats.monthly_active_events || [];
  const perfData = revMonths.map((m) => {
    const ev = eventMonths.find((e) => e.key === m.key) || { count: 0 };
    return { label: m.label, revenue: m.amount, events: ev.count };
  });

  const hasRevenue = stats.total_revenue > 0;

  const kpis = [
    {
      label: "Total Workspaces", value: stats.total_workspaces, icon: Building2,
      accent: "bg-primary/10 text-primary",
      sub: `${stats.suspended_workspaces} suspended`,
      trend: growthTrend, trendUp: (growthTrend || 0) >= 0,
    },
    {
      label: "Pro Workspaces", value: stats.pro_workspaces, icon: Crown,
      accent: "bg-amber-100 text-amber-600",
      sub: `${stats.active_pro} active · ${stats.expired_pro} expired`,
    },
    {
      label: "Total Users", value: stats.total_users, icon: Users,
      accent: "bg-blue-100 text-blue-600",
      sub: `${stats.conversion_rate}% converted to Pro`,
    },
    {
      label: "Revenue Collected", value: moneyShort(stats.total_revenue), icon: Receipt,
      accent: "bg-success/10 text-success",
      sub: `ARPU ${money(stats.arpu)} · ${stats.recent_payments?.length || 0} payments`,
      trend: revTrend, trendUp: (revTrend || 0) >= 0,
    },
  ];

  const funnel = [
    { label: "Total Workspaces", value: stats.total_workspaces, color: "bg-primary", width: 100 },
    { label: "Pro Subscribed", value: stats.pro_workspaces, color: "bg-amber-500", width: stats.total_workspaces ? (stats.pro_workspaces / stats.total_workspaces) * 100 : 0 },
    { label: "Active Pro", value: stats.active_pro, color: "bg-success", width: stats.total_workspaces ? (stats.active_pro / stats.total_workspaces) * 100 : 0 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor workspaces, subscriptions and platform performance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors">
            Manage Workspaces <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link to="/admin/plans" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
            <Settings className="w-3.5 h-3.5" /> Plans & Pricing
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpis.map((c) => <AdminKpiCard key={c.label} {...c} />)}
      </div>

      {/* Business Performance */}
      <AdminSectionCard
        icon={BarChart3}
        title="Business Performance"
        action={
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-success" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Active Events
            </span>
          </div>
        }
      >
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
              <Bar yAxisId="ev" dataKey="events" name="Active Events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={22} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#perfRevGrad)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AdminSectionCard>

      {/* Revenue + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminSectionCard
          icon={Receipt}
          title="Revenue Trend"
          className="lg:col-span-2"
          action={<span className="text-xs text-muted-foreground">Total: {money(stats.total_revenue)}</span>}
        >
          {hasRevenue ? (
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
          ) : (
            <div className="h-44 flex items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">Revenue data will appear here once subscriptions generate payments.</p>
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard icon={Filter} title="Conversion Funnel">
          <AdminFunnel stages={funnel} />
        </AdminSectionCard>
      </div>

      {/* Recent Activity + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminSectionCard
          icon={Activity}
          title="Recent Activity"
          className="lg:col-span-2"
          action={<Link to="/admin/workspaces" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>}
        >
          <AdminRecentActivity
            workspaces={stats.recent_workspaces || []}
            payments={stats.recent_payments || []}
          />
        </AdminSectionCard>

        <AdminSectionCard icon={LayoutDashboard} title="Platform Overview">
          <AdminOverviewPanel stats={stats} />
        </AdminSectionCard>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</span>
        <Link to="/admin/workspaces" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
          <Building2 className="w-3.5 h-3.5" /> Manage Workspaces
        </Link>
        <Link to="/admin/plans" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
          <Settings className="w-3.5 h-3.5" /> Plans & Pricing
        </Link>
      </div>
    </div>
  );
}