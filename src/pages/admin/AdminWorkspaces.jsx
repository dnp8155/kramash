import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";

const planBadge = (plan, status) => {
  const map = {
    pro: "bg-amber-100 text-amber-700",
    free: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive",
    suspended: "bg-destructive/10 text-destructive"
  };
  const key = status === "expired" || status === "suspended" ? status : plan;
  return map[key] || map.free;
};

export default function AdminWorkspaces() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["admin", "workspaces", debouncedSearch],
    queryFn: async () => (await base44.functions.invoke("adminListWorkspaces", { search: debouncedSearch })).data,
    staleTime: 30 * 1000,
  });
  const rows = data?.workspaces || [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Workspaces</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, owner, email…"
          className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-sm text-destructive">{error?.message || "Failed to load workspaces"}</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No workspaces found" />
      ) : (
        <>
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{r.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${planBadge(r.plan_type, r.plan_status)}`}>
                  {r.plan_type === "pro" ? "Pro" : "Free"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{r.owner_name} · {r.owner_email}</div>
              <div className="text-xs text-muted-foreground">Created {r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"} · Expires {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</div>
              <div className="text-xs text-muted-foreground">Status: <span className="capitalize">{r.plan_status}</span> · Storage {r.storage_gb || 0} GB</div>
              <div className="text-xs text-muted-foreground">Usage: {r.usage.events}E · {r.usage.team_members}T · {r.usage.services}S</div>
              <Link to={`/admin/workspaces/${r.id}`} className="text-primary hover:underline inline-flex items-center text-sm">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Workspace</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Expiry</th>
                <th className="px-3 py-2 font-medium">Storage</th>
                <th className="px-3 py-2 font-medium">Usage</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <div className="text-foreground">{r.owner_name}</div>
                    <div className="text-xs text-muted-foreground">{r.owner_email}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${planBadge(r.plan_type, r.plan_status)}`}>
                      {r.plan_type === "pro" ? "Pro" : "Free"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground capitalize">{r.plan_status}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <span className="font-medium text-foreground">{r.storage_gb || 0} GB</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {r.usage.events}E · {r.usage.team_members}T · {r.usage.services}S
                  </td>
                  <td className="px-3 py-2">
                    <Link to={`/admin/workspaces/${r.id}`} className="text-primary hover:underline inline-flex items-center">
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}