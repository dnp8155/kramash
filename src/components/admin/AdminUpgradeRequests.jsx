import { useState } from "react";
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
  const pending = (data || []).filter((r) => r.status === "PENDING");

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
        <div className="divide-y divide-border">
          {pending.map((r) => (
            <div key={r.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{r.workspace?.name || "Unknown workspace"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.pricing ? `${BILLING_LABELS[r.pricing.billing_cycle] || r.pricing.billing_cycle} · ₹${Number(r.pricing.price || 0).toLocaleString("en-IN")}` : "Pro"}
                  {" · "}{when(r.requested_at || r.created_at)}
                  {r.workspace?.phone ? ` · ${r.workspace.phone}` : ""}
                </div>
                {r.note && <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.note}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => reject(r)}
                  disabled={busy === r.id}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  Reject
                </button>
                <Link to={`/admin/workspaces/${r.workspace_id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover">
                  Review &amp; assign Pro <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setToDelete(r)}
                  disabled={busy === r.id}
                  aria-label="Delete request"
                  title="Delete request"
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
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
