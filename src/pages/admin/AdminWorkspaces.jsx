import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Building2, Crown } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

const planBadgeClass = (plan, status) => {
  if (status === "suspended") return "bg-destructive/10 text-destructive";
  if (status === "expired") return "bg-amber-100 text-amber-700";
  if (plan === "pro") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
};

const statusBadgeClass = (status) => {
  if (status === "suspended") return "bg-destructive/10 text-destructive";
  if (status === "expired") return "bg-amber-100 text-amber-700";
  return "bg-success/10 text-success";
};

export default function AdminWorkspaces() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["admin", "workspaces", debouncedSearch],
    queryFn: async () => (await base44.functions.invoke("adminListWorkspaces", { search: debouncedSearch })).data,
    staleTime: 30 * 1000,
  });
  const rows = data?.workspaces || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all platform workspaces, plans and status.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, owner, email…"
          className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-destructive mb-3">Unable to load workspaces.</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState
            title="No workspaces found"
            description={search ? "Try a different search term." : "No workspaces have been created yet."}
          />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.owner_name} · {r.owner_email}</div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0", planBadgeClass(r.plan_type, r.plan_status))}>
                    {r.plan_type === "pro" && <Crown className="w-3 h-3" />}
                    {r.plan_type === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium capitalize", statusBadgeClass(r.plan_status))}>
                    {r.plan_status}
                  </span>
                  <span>Created {r.created_date ? new Date(r.created_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>{r.storage_gb || 0} GB · {r.usage.events}E · {r.usage.team_members}T · {r.usage.services}S</span>
                  <Link to={`/admin/workspaces/${r.id}`} className="text-primary hover:underline inline-flex items-center font-medium">
                    Manage <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 font-medium">Workspace</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expiry</th>
                    <th className="px-4 py-3 font-medium">Storage</th>
                    <th className="px-4 py-3 font-medium">Usage</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{r.owner_name}</div>
                        <div className="text-xs text-muted-foreground">{r.owner_email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {r.created_date ? new Date(r.created_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", planBadgeClass(r.plan_type, r.plan_status))}>
                          {r.plan_type === "pro" && <Crown className="w-3 h-3" />}
                          {r.plan_type === "pro" ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium capitalize", statusBadgeClass(r.plan_status))}>
                          {r.plan_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="font-medium text-foreground">{r.storage_gb || 0} GB</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {r.usage.events}E · {r.usage.team_members}T · {r.usage.services}S
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/workspaces/${r.id}`} className="text-primary hover:underline inline-flex items-center text-xs font-medium">
                          Manage <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}