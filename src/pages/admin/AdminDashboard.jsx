import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Crown, CheckCircle2, XCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingState from "@/components/common/LoadingState";

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

  const cards = [
    { label: "Total Workspaces", value: stats.total_workspaces, icon: Building2, tone: "text-primary" },
    { label: "Free Workspaces", value: stats.free_workspaces, icon: Building2, tone: "text-muted-foreground" },
    { label: "Pro Workspaces", value: stats.pro_workspaces, icon: Crown, tone: "text-amber-600" },
    { label: "Active Pro", value: stats.active_pro, icon: CheckCircle2, tone: "text-success" },
    { label: "Expired Pro", value: stats.expired_pro, icon: XCircle, tone: "text-destructive" },
    { label: "Total Users", value: stats.total_users, icon: Users, tone: "text-primary" }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Platform Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-lg p-4">
              <Icon className={`w-5 h-5 mb-2 ${c.tone}`} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/workspaces" className="text-sm text-primary underline">Manage workspaces →</Link>
        <Link to="/admin/plans" className="text-sm text-primary underline ml-4">Configure plans & pricing →</Link>
      </div>
    </div>
  );
}