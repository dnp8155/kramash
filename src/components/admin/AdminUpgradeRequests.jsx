import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, ArrowRight, X } from "lucide-react";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import { fetchAdminUpgradeRequests, reviewAdminUpgradeRequests, deleteAdminUpgradeRequest } from "@/lib/adminService";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

function when(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Pending "Request Upgrade" taps. Activating Pro happens on the workspace page (Assign Pro), which
// also closes the request; Reject is for requests that won't be activated.
export default function AdminUpgradeRequests() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "upgrade-requests"],
    queryFn: fetchAdminUpgradeRequests,
    staleTime: 30 * 1000,
  });
  // Requests from workspaces that already have Pro are not shown (they have nothing to approve).
  const pending = (data || []).filter((r) => r.status === "PENDING" && !r.already_pro);

  // ...and they are closed in the database too, once, so they never come back and the user's request isn't left hanging.
  const staleIds = (data || []).filter((r) => r.status === "PENDING" && r.already_pro).map((r) => r.workspace_id);
  const staleKey = [...new Set(staleIds)].join(",");
  useEffect(() => {
    if (!staleKey) return;
    let cancelled = false;
    (async () => {
      for (const workspaceId of staleKey.split(",")) {
        try { await reviewAdminUpgradeRequests({ workspaceId, status: "APPROVED" }); } catch { /* shown-hidden anyway; retried next load */ }
      }
      if (!cancelled) qc.invalidateQueries({ queryKey: ["admin", "upgrade-requests"] });
    })();
    return () => { cancelled = true; };
  }, [staleKey, qc]);

  const reject = async (r) => {
    setBusy(r.id);
    try {
      await reviewAdminUpgradeRequests({ id: r.id, status: "REJECTED" });
      await qc.invalidateQueries({ queryKey: ["admin", "upgrade-requests"] });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r) => {
    setBusy(r.id);
    try {
      await deleteAdminUpgradeRequest(r.id);
      await qc.invalidateQueries({ queryKey: ["admin", "upgrade-requests"] });
    } finally {
      setBusy(null);
      setToDelete(null);
    }
  };

  return (
    <AdminSectionCard
      icon={Crown}
      title="Upgrade Requests"
      action={pending.length > 0 ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold inline-flex items-center justify-center">{pending.length}</span> : null}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Unable to load upgrade requests.</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending upgrade requests.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 flex-wrap">
              <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-warning" />
              </div>
              <div className="min-w-0 flex-1 basis-48">
                <div className="text-sm font-semibold text-foreground truncate">{r.workspace?.name || "Unknown workspace"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.pricing ? `${BILLING_LABELS[r.pricing.billing_cycle] || r.pricing.billing_cycle} · ₹${Number(r.pricing.price || 0).toLocaleString("en-IN")}` : "Pro"}
                  {" · "}{when(r.requested_at || r.created_at)}
                  {r.workspace?.phone ? ` · ${r.workspace.phone}` : ""}
                </div>
                {r.note && <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.note}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => reject(r)} disabled={busy === r.id}>Reject</Button>
                <Link to={`/admin/workspaces/${r.workspace_id}`}>
                  <Button variant="primary" size="sm">Review &amp; assign Pro <ArrowRight className="w-3.5 h-3.5" /></Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(r)}
                  disabled={busy === r.id}
                  aria-label="Delete request"
                  title="Delete request"
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AppDialog open={!!toDelete} onOpenChange={(o) => { if (!o && !busy) setToDelete(null); }}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>Delete upgrade request?</AppDialogTitle>
            <AppDialogDescription>
              The request from {toDelete?.workspace?.name || "this workspace"} will be removed permanently. This can't be undone.
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={!!busy}>Cancel</Button>
            <Button variant="destructive" onClick={() => remove(toDelete)} disabled={!!busy}>Delete</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </AdminSectionCard>
  );
}
