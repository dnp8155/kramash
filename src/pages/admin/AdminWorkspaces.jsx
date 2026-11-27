import AdminBackButton from "@/components/admin/AdminBackButton";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminWorkspaces, formatStorage, formatLastSeen, formatSignInMethods, prefetchAdminWorkspaceDetails } from "@/lib/adminService";
import { Link } from "react-router-dom";
import { Search, ChevronRight, Building2, Crown, CalendarDays, UserCheck, Briefcase, UserPlus, HardDrive } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

// The plan badge shows only the plan; suspended / expired get their own badge next to it.
const planBadgeClass = (plan) => (plan === "pro" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground");

// "20 Nov 2026"
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const statusBadgeClass = (status) => {
  if (status === "suspended") return "bg-destructive/10 text-destructive";
  if (status === "expired") return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
};

export default function AdminWorkspaces() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // The whole list is loaded once and searched here, so typing is instant (it used to reload from the server per search).
  const qc = useQueryClient();
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["admin", "workspaces"],
    queryFn: () => fetchAdminWorkspaces(),
    staleTime: 60 * 1000,
  });
  const rows = useMemo(() => {
    const all = data?.workspaces || [];
    const q = debouncedSearch.trim().toLowerCase();
    return q ? all.filter((r) => `${r.name} ${r.owner_name} ${r.owner_email}`.toLowerCase().includes(q)) : all;
  }, [data, debouncedSearch]);
  // Start loading a workspace's page when the mouse rests on its row (or it gets keyboard focus), so it's ready on
  // click. Passing over rows does nothing (a short wait), and touch never warms: a swipe would warm every row.
  const warmTimer = useRef(null);
  const warm = (id) => prefetchAdminWorkspaceDetails(qc, id);
  const warmSoon = (e, id) => {
    if (e.pointerType === "touch") return;
    clearTimeout(warmTimer.current);
    warmTimer.current = setTimeout(() => warm(id), 150);
  };
  const warmCancel = () => clearTimeout(warmTimer.current);
  useEffect(() => () => clearTimeout(warmTimer.current), []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <AdminBackButton />
        <div>
          <h1 className="text-xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all platform workspaces, plans and status.</p>
        </div>
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
        <div className="bg-card border border-border rounded-[15px] p-8 text-center">
          <p className="text-sm text-destructive mb-3">{error?.message || "Unable to load workspaces."}</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-[15px]">
          <EmptyState
            title="No workspaces found"
            description={search ? "Try a different search term." : "No workspaces have been created yet."}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[15px] divide-y divide-border overflow-hidden">
          {rows.map((r) => {
            const isPro = r.plan_type === "pro";
            const flagged = r.plan_status === "suspended" || r.plan_status === "expired";
            const usage = [
              { icon: CalendarDays, n: r.usage.events, title: "Work items" },
              { icon: UserCheck, n: r.usage.team_members, title: "Team members" },
              { icon: Briefcase, n: r.usage.services, title: "Services" },
              { icon: UserPlus, n: r.usage.leads, title: "Leads" },
            ];
            return (
              <Link
                key={r.id}
                to={`/admin/workspaces/${r.id}`}
                onPointerEnter={(e) => warmSoon(e, r.id)}
                onPointerLeave={warmCancel}
                onFocus={() => warm(r.id)}
                className="flex items-start gap-3 px-3.5 sm:px-4 py-3.5 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:bg-muted/40"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate max-w-full">{r.name}</span>
                    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", planBadgeClass(r.plan_type))}>
                      {isPro && <Crown className="w-3 h-3" />}{isPro ? "Pro" : "Free"}
                    </span>
                    {flagged && (
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", statusBadgeClass(r.plan_status))}>{r.plan_status}</span>
                    )}
                  </div>
                  {/* Phones: owner and email on their own lines (nothing cut off); larger screens: one line. */}
                  <div className="text-xs text-muted-foreground mt-0.5 sm:truncate">
                    <span className="block sm:inline truncate">{r.owner_name}{r.sign_in_methods ? ` · ${formatSignInMethods(r.sign_in_methods)}` : ""}</span>
                    {r.owner_email && <><span className="hidden sm:inline"> · </span><span className="block sm:inline truncate">{r.owner_email}</span></>}
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-xs text-muted-foreground mt-1.5">
                    <span>Joined {fmtDate(r.created_date)}</span>
                    <span className="sm:hidden">Active {formatLastSeen(r.last_active_at || r.last_sign_in_at)}</span>
                    {r.last_sign_in_at && <span>Signed in {formatLastSeen(r.last_sign_in_at)}</span>}
                    {r.expires_at && <span>{r.plan_status === "expired" || (!isPro && new Date(r.expires_at) < new Date()) ? "Pro ended" : isPro ? "Pro until" : "Expiry"} {fmtDate(r.expires_at)}</span>}
                    <span title="Storage used" className="inline-flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span className="text-foreground">{formatStorage(r.storage_used_bytes)}</span>{r.storage_allowance_gb > 0 ? ` / ${r.storage_allowance_gb} GB` : ""}
                    </span>
                    <span className="inline-flex items-center gap-2.5">
                      {usage.map(({ icon: Icon, n, title }) => (
                        <span key={title} title={title} className="inline-flex items-center gap-1 tabular-nums">
                          <Icon className="w-3.5 h-3.5" />{n ?? 0}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap" title={r.last_sign_in_at ? `Last sign-in ${formatLastSeen(r.last_sign_in_at)}` : undefined}>
                    {formatLastSeen(r.last_active_at || r.last_sign_in_at)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}