import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useAdminData } from "@/hooks/useAdminData";
import { getCurrentSubscription, getEffectivePlanCode, isSubscriptionActive } from "@/utils/plan";
import { CATEGORY_LABELS, inferCategory } from "@/lib/BusinessTerminology";
import { formatDate } from "@/utils/format";

export default function AdminWorkspaces() {
  const navigate = useNavigate();
  const { workspaces, users, subscriptions, loading, error, refetch } = useAdminData();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workspaces
      .filter((ws) => {
        if (!q) return true;
        const owner = users.find((u) => u.id === ws.owner_user_id);
        return (
          ws.name?.toLowerCase().includes(q) ||
          owner?.email?.toLowerCase().includes(q) ||
          owner?.full_name?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [workspaces, users, search]);

  if (loading) return <LoadingState label="Loading workspaces…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Workspaces" description="View and manage all registered workspaces." />

      <Card>
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by workspace name or owner email…"
              className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>{filtered.length} Workspaces</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Workspace</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Expiry</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ws) => {
                  const sub = getCurrentSubscription(subscriptions, ws.id);
                  const planCode = getEffectivePlanCode(sub);
                  const owner = users.find((u) => u.id === ws.owner_user_id);
                  return (
                    <tr key={ws.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/admin/workspaces/${ws.id}`)}>
                      <td className="px-5 py-3 font-medium text-foreground">{ws.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{owner?.email || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {CATEGORY_LABELS[inferCategory(ws)] || "—"}
                        {ws.business_category === "OTHER" && ws.custom_business_type ? ` (${ws.custom_business_type})` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <span className={planCode === "PRO" ? "font-semibold text-warning" : "text-muted-foreground"}>
                          {planCode === "PRO" ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={ws.plan_status || "active"} />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {sub?.expires_at ? formatDate(sub.expires_at) : "—"}
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
        </CardBody>
      </Card>
    </div>
  );
}