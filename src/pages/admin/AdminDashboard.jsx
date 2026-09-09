import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, CheckCircle2, AlertCircle, Crown, Eye } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useAdminData } from "@/hooks/useAdminData";
import { getCurrentSubscription, getEffectivePlanCode, isSubscriptionActive } from "@/utils/plan";
import { formatDate } from "@/utils/format";
import IntegrationStatus from "@/components/admin/IntegrationStatus";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { workspaces, users, subscriptions, loading, error, refetch } = useAdminData();

  const stats = useMemo(() => {
    let freeCount = 0, proCount = 0, activePro = 0, expiredPro = 0;
    for (const ws of workspaces) {
      const sub = getCurrentSubscription(subscriptions, ws.id);
      const planCode = getEffectivePlanCode(sub);
      if (planCode === "PRO") {
        proCount++;
        if (isSubscriptionActive(sub)) activePro++;
        else expiredPro++;
      } else {
        freeCount++;
      }
    }
    return {
      total: workspaces.length,
      free: freeCount,
      pro: proCount,
      activePro,
      expiredPro,
      totalUsers: users.length,
    };
  }, [workspaces, subscriptions]);

  const recentWorkspaces = useMemo(() => {
    return [...workspaces]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 8);
  }, [workspaces]);

  if (loading) return <LoadingState label="Loading admin dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const cards = [
    { label: "Total Workspaces", value: stats.total, icon: Building2, color: "text-primary" },
    { label: "Free Workspaces", value: stats.free, icon: Building2, color: "text-muted-foreground" },
    { label: "Pro Workspaces", value: stats.pro, icon: Crown, color: "text-warning" },
    { label: "Active Pro", value: stats.activePro, icon: CheckCircle2, color: "text-success" },
    { label: "Expired Pro", value: stats.expiredPro, icon: AlertCircle, color: "text-destructive" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-info" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Dashboard" description="Platform overview and workspace management." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardBody className="flex flex-col gap-2">
                <Icon className={`h-5 w-5 ${c.color}`} />
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <IntegrationStatus />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Workspaces</CardTitle>
          <button
            onClick={() => navigate("/admin/workspaces")}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all →
          </button>
        </CardHeader>
        <CardBody className="p-0">
          {recentWorkspaces.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No workspaces yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Workspace</th>
                    <th className="px-5 py-3 font-semibold">Owner</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentWorkspaces.map((ws) => {
                    const sub = getCurrentSubscription(subscriptions, ws.id);
                    const planCode = getEffectivePlanCode(sub);
                    const owner = users.find((u) => u.id === ws.owner_user_id);
                    return (
                      <tr key={ws.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/admin/workspaces/${ws.id}`)}>
                        <td className="px-5 py-3 font-medium text-foreground">{ws.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{owner?.email || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={planCode === "PRO" ? "font-semibold text-warning" : "text-muted-foreground"}>
                            {planCode === "PRO" ? "Pro" : "Free"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {ws.plan_status || "active"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(ws.created_date)}</td>
                        <td className="px-5 py-3 text-right">
                          <Eye className="ml-auto h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}