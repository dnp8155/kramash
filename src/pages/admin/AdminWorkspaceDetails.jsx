import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import LoadingState from "@/components/common/LoadingState";
import { ArrowLeft, Crown, Ban, CheckCircle2, RefreshCw } from "lucide-react";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

export default function AdminWorkspaceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricings, setPricings] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ pricing_id: "", start_date: new Date().toISOString().split("T")[0], note: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("adminGetWorkspaceDetails", { workspace_id: id });
      setData(res.data);
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
        note: assignForm.note
      });
      setShowAssign(false);
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

  if (loading) return <LoadingState label="Loading workspace…" />;
  if (error && !data) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!data) return null;

  const { workspace, plan, usage, subscriptions } = data;
  const isPro = plan.plan_code === "PRO" && !plan.is_expired;
  const isSuspended = plan.plan_status === "suspended";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate("/admin/workspaces")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to workspaces
      </button>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">{workspace.business_type || "—"} · {workspace.city || "—"}, {workspace.country || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => { setAssignForm({ pricing_id: pricings[0]?.id || "", start_date: new Date().toISOString().split("T")[0], note: "" }); setShowAssign(true); }}>
            <Crown className="w-3.5 h-3.5" /> {isPro ? "Renew Pro" : "Assign Pro"}
          </Button>
          {isPro && (
            <Button variant="outline" size="sm" onClick={() => setConfirmDowngrade(true)}>Downgrade to Free</Button>
          )}
          <Button variant={isSuspended ? "success" : "destructive"} size="sm" onClick={toggleSuspend} disabled={actionLoading}>
            {isSuspended ? <><CheckCircle2 className="w-3.5 h-3.5" /> Reactivate</> : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
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
          <Row label="Storage (GB)" value={plan.storage_gb || 0} />
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
          <UsageCard label="Storage (GB)" value={plan.storage_gb || 0} />
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
      <Dialog open={showAssign} onOpenChange={(o) => !o && setShowAssign(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isPro ? "Renew Pro" : "Assign Pro"}</DialogTitle>
            <DialogDescription>Select a billing cycle and start date. Expiry is calculated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Billing Cycle</Label>
              <Select value={assignForm.pricing_id} onChange={(e) => setAssignForm((f) => ({ ...f, pricing_id: e.target.value }))} className="w-full">
                <option value="">Select…</option>
                {pricings.map((p) => (
                  <option key={p.id} value={p.id}>{BILLING_LABELS[p.billing_cycle] || p.billing_cycle} — ₹{p.price} ({p.duration_months} mo)</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={assignForm.note} onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))} placeholder="Reason for assignment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={doAssign} disabled={actionLoading || !assignForm.pricing_id || !assignForm.start_date}>
              {actionLoading ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade confirm */}
      <Dialog open={confirmDowngrade} onOpenChange={(o) => !o && setConfirmDowngrade(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Downgrade to Free?</DialogTitle>
            <DialogDescription>
              Existing workspace data will not be deleted. Free Plan limits will apply to new records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDowngrade(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="destructive" onClick={doDowngrade} disabled={actionLoading}>
              {actionLoading ? "Downgrading…" : "Downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
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