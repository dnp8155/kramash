import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Building2, Crown, CheckCircle2, XCircle, Users, TrendingUp,
  IndianRupee, ArrowRight, PauseCircle, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import LoadingState from "@/components/common/LoadingState";
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

function dateShort(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("adminDashboardStats", {});
        setStats(res.data);
      } catch (e) {
        setError(e?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!stats) return null;

  const kpis = [
    { label: "Total Workspaces", value: stats.total_workspaces, icon: Building2, tone: "bg-primary/10 text-primary", sub: `${stats.suspended_workspaces} suspended` },
    { label: "Pro Workspaces", value: stats.pro_workspaces, icon: Crown, tone: "bg-amber-100 text-amber-600", sub: `${stats.active_pro} active · ${stats.expired_pro} expired` },
    { label: "Total Users", value: stats.total_users, icon: Users, tone: "bg-blue-100 text-blue-600", sub: `${stats.conversion_rate}% conversion to Pro` },
    { label: "Revenue Collected", value: money(stats.total_revenue), icon: IndianRupee, tone: "bg-success/10 text-success", sub: `${stats.recent_payments?.length || 0} recent payments` },
  ];

  const maxGrowth = Math.max(...stats.monthly_growth.map((m) => m.count), 1);
  const totalCat = Object.values(stats.category_distribution || {}).reduce((s, n) => s + n, 0) || 1;
  const catEntries = Object.entries(stats.category_distribution || {}).sort((a, b) => b[1] - a[1]);

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
              </div>
              <div className="text-2xl font-bold mt-3 text-foreground">{c.value}</div>
              <div className="text-sm font-medium text-foreground mt-0.5">{c.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly growth chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Workspace Growth (6 months)</h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-40">
            {stats.monthly_growth.map((m) => (
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
          <h2 className="text-sm font-semibold text-foreground px-5 py-4 border-b border-border">Recent Payments</h2>
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