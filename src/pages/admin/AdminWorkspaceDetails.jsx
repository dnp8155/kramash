import AdminBackButton from "@/components/admin/AdminBackButton";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatStorage, deleteAdminWorkspaceAndUser, reviewAdminUpgradeRequests, fetchLaunchGrantCount } from "@/lib/adminService";
import { LAUNCH_FREE_MONTH_CAP } from "@/constants/launchOffer";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Ban, CheckCircle2, Trash2 } from "lucide-react";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

export default function AdminWorkspaceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricings, setPricings] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ pricing_id: "", start_date: new Date().toISOString().split("T")[0], note: "", launch: false });
  const [launchUsed, setLaunchUsed] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("adminGetWorkspaceDetails", { workspace_id: id });
      setData(res?.data || res);
      const allPricings = await base44.entities.PlanPricing.list();
      setPricings(allPricings.filter((p) => p.is_active));
    } catch (e) {
      setError(e?.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doAssign = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke("assignProSubscription", {
        workspace_id: id,
        pricing_id: assignForm.pricing_id,
        start_date: assignForm.start_date,
        note: assignForm.note,
        launch_offer: assignForm.launch
      });
      setShowAssign(false);
      // Pro is active now, so close this workspace's pending upgrade requests (best effort).
      try { await reviewAdminUpgradeRequests({ workspaceId: id, status: "APPROVED" }); } catch { /* request list can be cleared by hand */ }
      await load();
    } catch (e) {
      setError(e?.message || "Failed to assign Pro");
    } finally {
      setActionLoading(false);
    }
  };

  const doDowngrade = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke("downgradeToFree", { workspace_id: id });
      setConfirmDowngrade(false);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to downgrade");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSuspend = async () => {
    setActionLoading(true);
    const target = data.plan.plan_status === "suspended" ? "ACTIVE" : "SUSPENDED";
    try {
      await base44.functions.invoke("adminSetWorkspaceStatus", { workspace_id: id, status: target });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const doDeleteWorkspaceAndUser = async () => {
    setActionLoading(true);
    try {
      await deleteAdminWorkspaceAndUser(id, true);
      setConfirmDelete(false);
      navigate("/admin/workspaces", { replace: true });
    } catch (e) {
      setError(e?.message || "Failed to delete workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const openAssign = () => {
    setAssignForm({ pricing_id: pricings[0]?.id || "", start_date: new Date().toISOString().split("T")[0], note: "", launch: false });
    setShowAssign(true);
    fetchLaunchGrantCount().then(setLaunchUsed).catch(() => setLaunchUsed(null));
  };
  const toggleLaunch = (on) => setAssignForm((f) => ({
    ...f, launch: on,
    // The free month is always the Monthly option.
    pricing_id: on ? (pricings.find((p) => p.billing_cycle === "MONTHLY")?.id || f.pricing_id) : f.pricing_id,
  }));

  if (loading) return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-40" /></div>
        </div>
        <div className="flex gap-2"><Skeleton className="h-8 w-28 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div>
      </div>
      <Skeleton className="h-40 w-full rounded-[15px]" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[15px]" />)}</div>
      <Skeleton className="h-48 w-full rounded-[15px]" />
    </div>
  );
  if (error && !data) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!data) return null;

  const { workspace, plan, usage, subscriptions } = data;
  const isPro = plan.plan_code === "PRO" && !plan.is_expired;
  const isSuspended = plan.plan_status === "suspended";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AdminBackButton />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
              {workspace.name}
              {subscriptions.some((s) => s.source === "PROMOTIONAL") && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">Early supporter</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{workspace.business_type || "—"} · {workspace.city || "—"}, {workspace.country || "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={openAssign}>
            <Crown className="w-3.5 h-3.5" /> {isPro ? "Renew Pro" : "Assign Pro"}
          </Button>
          {isPro && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDowngrade(true)}>Downgrade to Free</Button>
          )}
          <Button variant={isSuspended ? "success" : "destructive"} size="sm" onClick={toggleSuspend} disabled={actionLoading}>
            {isSuspended ? <><CheckCircle2 className="w-3.5 h-3.5" /> Reactivate</> : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>
            <Trash2 className="w-3.5 h-3.5" /> Delete User & Workspace
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Business">
          <Row label="Owner" value={workspace.owner_name} />
          <Row label="Email" value={workspace.owner_email} />
          <Row label="Phone" value={workspace.phone || "—"} />
          <Row label="Currency" value={workspace.currency || "—"} />
          <Row label="GST Enabled" value={workspace.gst_enabled ? "Yes" : "No"} />
          <Row label="Created" value={workspace.created_date ? new Date(workspace.created_date).toLocaleDateString() : "—"} />
        </Section>

        <Section title="Plan & Subscription">
          <Row label="Current Plan" value={plan.plan_code === "PRO" ? "Pro" : "Free"} />
          <Row label="Status" value={plan.plan_status} />
          <Row label="Expiry" value={plan.expires_at ? new Date(plan.expires_at).toLocaleDateString() : "—"} />
          <Row label="Expired" value={plan.is_expired ? "Yes" : "No"} />
          <Row label="Storage allowance" value={`${plan.storage_gb || 0} GB`} />
          <div className="pt-2 border-t border-border mt-2">
            <div className="text-xs text-muted-foreground mb-1">Limits</div>
            {Object.entries(plan.limits).map(([k, v]) => (
              <Row key={k} label={k} value={String(v)} />
            ))}
          </div>
        </Section>
      </div>

      <Section title="Usage">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UsageCard label="Events" value={usage.events} />
          <UsageCard label="Team Members" value={usage.team_members} />
          <UsageCard label="Services" value={usage.services} />
          <UsageCard label="Leads" value={usage.leads ?? "—"} />
          <UsageCard label={`Storage used (of ${plan.storage_gb || 0} GB)`} value={formatStorage(usage.storage_used_bytes)} />
        </div>
      </Section>

      <Section title="Subscription History">
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Source</th>
                  <th className="py-1.5 font-medium">Billing</th>
                  <th className="py-1.5 font-medium">Started</th>
                  <th className="py-1.5 font-medium">Expires</th>
                  <th className="py-1.5 font-medium">Price</th>
                  <th className="py-1.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-1.5">{s.status}</td>
                    <td className="py-1.5">{s.source}</td>
                    <td className="py-1.5">{BILLING_LABELS[s.billing_cycle_snapshot] || s.billing_cycle_snapshot || "—"}</td>
                    <td className="py-1.5">{s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5">₹{s.assigned_price || 0}</td>
                    <td className="py-1.5 text-muted-foreground">{s.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Assign/Renew Pro dialog */}
      <AppDialog open={showAssign} onOpenChange={(o) => !o && setShowAssign(false)}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>{isPro ? "Renew Pro" : "Assign Pro"}</AppDialogTitle>
            <AppDialogDescription>Select a billing cycle and start date. Expiry is calculated automatically.</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label>Billing Cycle</Label>
              <Select disabled={assignForm.launch} value={assignForm.pricing_id} onChange={(e) => setAssignForm((f) => ({ ...f, pricing_id: e.target.value }))} className="w-full">
                <option value="">Select…</option>
                {pricings.map((p) => (
                  <option key={p.id} value={p.id}>{BILLING_LABELS[p.billing_cycle] || p.billing_cycle} — ₹{p.price} ({p.duration_months} mo)</option>
                ))}
              </Select>
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-border p-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={assignForm.launch} onChange={(e) => toggleLaunch(e.target.checked)} />
              <span className="text-sm">
                <span className="font-medium">Launch offer — free 1 month</span>
                <span className="block text-xs text-muted-foreground">Recorded as ₹0 · {launchUsed === null ? "…" : launchUsed} of {LAUNCH_FREE_MONTH_CAP} spots used</span>
              </span>
            </label>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={assignForm.note} onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))} placeholder="Reason for assignment" />
            </div>
          </AppDialogBody>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={doAssign} disabled={actionLoading || !assignForm.pricing_id || !assignForm.start_date}>
              {actionLoading ? "Saving…" : "Confirm"}
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      {/* Downgrade confirm */}
      <AppDialog open={confirmDowngrade} onOpenChange={(o) => !o && setConfirmDowngrade(false)}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>Downgrade to Free?</AppDialogTitle>
            <AppDialogDescription>
              Existing workspace data will not be deleted. Free Plan limits will apply to new records.
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setConfirmDowngrade(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="destructive" onClick={doDowngrade} disabled={actionLoading}>
              {actionLoading ? "Downgrading…" : "Downgrade"}
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      {/* Permanent Delete confirm */}
      <AppDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AppDialogContent maxWidth="max-w-md">
          <AppDialogHeader>
            <AppDialogTitle className="text-destructive">Permanently Delete Workspace & User Account?</AppDialogTitle>
            <AppDialogDescription className="space-y-2 pt-2">
              <span className="block text-foreground font-medium">Warning: This action cannot be undone.</span>
              <span className="block text-muted-foreground text-xs">
                Deleting this workspace will permanently erase all events, clients, quotations, invoices, payments, leads, team members, and file storage data. The owner's user account will also be purged completely from Supabase Auth.
              </span>
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="destructive" onClick={doDeleteWorkspaceAndUser} disabled={actionLoading}>
              {actionLoading ? "Deleting Data & Account…" : "Permanently Delete Account & Data"}
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function UsageCard({ label, value }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}