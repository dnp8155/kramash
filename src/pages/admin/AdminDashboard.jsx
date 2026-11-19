import AdminBackButton from "@/components/admin/AdminBackButton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardStats } from "@/lib/adminService";
import {
  Building2, Crown, Users, Receipt, ArrowRight,
  BarChart3, Filter, Activity, LayoutDashboard
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
import AdminUpgradeRequests from "@/components/admin/AdminUpgradeRequests";
import ChartCard from "@/components/common/ChartCard";
import {
  CHART_PRIMARY, CHART_SUCCESS, CHART_MARGIN, CHART_TICK, CHART_GRID, CHART_Y_AXIS_WIDTH, CHART_TOOLTIP, CHART_LINE, chartDot,
} from "@/lib/chartTheme";

// Business Performance legend / switches (same pill style as the dashboard's Payments chart).
const PERF_SERIES = [
  { key: "revenue", label: "Revenue", color: CHART_SUCCESS },
  { key: "events", label: "Active Events", color: CHART_PRIMARY },
];

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
  const [perfVisible, setPerfVisible] = useState({ revenue: true, events: true });
  // Never allow both off — an empty chart explains nothing.
  const togglePerf = (key) => setPerfVisible((v) => {
    const next = { ...v, [key]: !v[key] };
    return next.revenue || next.events ? next : v;
  });
  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetchAdminDashboardStats(),
    staleTime: 30 * 1000,
  });

  if (loading && !stats) return (
    <div className="p-4 sm:p-6 space-y-6">
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
        <ChartSkeleton className="lg:col-span-2" pills={0} />
        <Skeleton className="h-64 w-full rounded-[15px]" />
      </div>
    </div>
  );

  if (error && !stats) return (
    <div className="p-4 sm:p-6">
      <div className="bg-card border border-border rounded-[15px] p-8 text-center">
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <AdminBackButton />
          <div>
            <h1 className="text-xl font-bold text-foreground">Platform Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monitor workspaces, subscriptions and platform performance.</p>
          </div>
        </div>
      </div>

      {/* Pending "Request Upgrade" taps from users */}
      <AdminUpgradeRequests />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpis.map((c) => <AdminKpiCard key={c.label} {...c} />)}
      </div>

      {/* Business Performance */}
      <ChartCard
        icon={BarChart3}
        title="Business Performance"
        subtitle={`Last ${perfData.length || 6} months`}
        series={PERF_SERIES}
        visible={perfVisible}
        onToggle={togglePerf}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={perfData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="perfRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_SUCCESS} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_SUCCESS} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" hide={!perfVisible.revenue} tick={CHART_TICK} axisLine={false} tickLine={false} width={CHART_Y_AXIS_WIDTH} tickFormatter={moneyShort} />
            <YAxis yAxisId="ev" hide={!perfVisible.events} orientation="right" tick={CHART_TICK} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            <Tooltip {...CHART_TOOLTIP} formatter={(v, name) => name === "Revenue" ? [money(v), name] : [v, "Active Events"]} />
            {perfVisible.events && <Bar yAxisId="ev" dataKey="events" name="Active Events" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} barSize={22} />}
            {perfVisible.revenue && <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_SUCCESS} {...CHART_LINE} fill="url(#perfRevGrad)" dot={chartDot(CHART_SUCCESS)} />}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          icon={Receipt}
          title="Revenue Trend"
          subtitle={`Last ${revMonths.length || 6} months`}
          className="lg:col-span-2"
          right={<span className="text-xs text-muted-foreground">Total: {money(stats.total_revenue)}</span>}
        >
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revMonths} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_SUCCESS} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={CHART_SUCCESS} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={CHART_Y_AXIS_WIDTH} tickFormatter={moneyShort} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [money(v), "Revenue"]} />
                <Area type="monotone" dataKey="amount" stroke={CHART_SUCCESS} {...CHART_LINE} fill="url(#revGrad)" dot={chartDot(CHART_SUCCESS)} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">Revenue data will appear here once subscriptions generate payments.</p>
            </div>
          )}
        </ChartCard>

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
    </div>
  );
}
