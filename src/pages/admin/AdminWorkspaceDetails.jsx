import AdminBackButton from "@/components/admin/AdminBackButton";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient, isCancelledError } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatStorage, deleteAdminWorkspaceAndUser, reviewAdminUpgradeRequests, fetchLaunchGrantCount, fetchAdminWorkspaces, formatLastSeen, formatSignInMethods, fetchAdminWorkspaceBilling, adminWorkspaceDetailsKey, fetchAdminWorkspaceDetails } from "@/lib/adminService";
import { generateSubscriptionReceiptPdf } from "@/lib/subscriptionReceiptPdf";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import { LAUNCH_FREE_MONTH_CAP } from "@/constants/launchOffer";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Ban, CheckCircle2, Trash2, Receipt, Loader2, Gift, CreditCard, Sparkles, Rocket } from "lucide-react";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };

// Subscription History: where each period came from, in plain words. Icons follow the app: Gift = gift,
// Sparkles = the Free plan (as on Admin → Plans), CreditCard = paid; Crown stays for Pro itself.
const SOURCE_KIND = {
  PAYMENT_GATEWAY: { label: "Paid online", icon: CreditCard, tone: "bg-success/10 text-success" },
  ADMIN: { label: "Gift", icon: Gift, tone: "bg-primary/10 text-primary" },
  PROMOTIONAL: { label: "Launch offer", icon: Rocket, tone: "bg-warning/10 text-warning" },
  ONBOARDING: { label: "Signed up", icon: Sparkles, tone: "bg-muted text-muted-foreground" },
};

// "20 Nov 2026" from a YYYY-MM-DD (or ISO) date.
function fmtDay(d) {
  if (!d) return "—";
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  return Number.isNaN(x.getTime()) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Active / Expired / Ended (replaced by a newer period or downgraded).
function subStatus(s) {
  if (s.status === "ACTIVE") {
    const expired = s.expires_at && new Date(`${String(s.expires_at).slice(0, 10)}T23:59:59`) < new Date();
    return expired ? { label: "Expired", cls: "bg-destructive/10 text-destructive" } : { label: "Active", cls: "bg-success/10 text-success" };
  }
  if (s.status === "EXPIRED") return { label: "Expired", cls: "bg-destructive/10 text-destructive" };
  return { label: "Ended", cls: "bg-muted text-muted-foreground" };
}

// Only the admin's own words: the automatic notes are already said by the row itself.
function cleanNote(note) {
  const n = String(note || "")
    .replace(/^Gift — free Pro:?\s*/, "")
    .replace(/^Launch offer — free 1 month:?\s*/, "")
    .trim();
  if (!n || /^(Admin assigned Pro|Initial Free plan|Activated via .* payment|Replaced by .*)$/i.test(n)) return "";
  return n;
}

// A fresh page (fresh state) per workspace, so nothing from one workspace can ever show on another.
export default function AdminWorkspaceDetails() {
  const { id } = useParams();
  return <AdminWorkspaceDetailsPage key={id} id={id} />;
}

function AdminWorkspaceDetailsPage({ id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState({}); // subscription id -> { by, receipt }
  const [pdf, setPdf] = useState({ open: false, url: "", filename: "", loading: false, id: null });
  const [activity, setActivity] = useState(null); // owner last active / last sign-in, from the workspace overview
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricings, setPricings] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ pricing_id: "", start_date: new Date().toISOString().split("T")[0], note: "", launch: false, notify: true });
  const [launchUsed, setLaunchUsed] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Everything the page needs starts at once. A copy already loaded (opened before, or started from the list when the
  // row was touched) shows straight away with no skeleton, and is refreshed underneath.
  // fresh: after Assign / Downgrade / Suspend, always ask the server again (quietly, no skeleton).
  const loadSeq = useRef(0);
  const load = async ({ fresh = false } = {}) => {
    const seq = ++loadSeq.current; // only the newest load may write the details
    const cached = fresh ? null : qc.getQueryData(adminWorkspaceDetailsKey(id));
    if (cached) { setData(cached); setLoading(false); }
    else if (!fresh) setLoading(true);
    setError("");
    fetchAdminWorkspaceBilling(id).then(setBilling).catch(() => setBilling({}));
    qc.fetchQuery({ queryKey: ["admin", "workspaces"], queryFn: () => fetchAdminWorkspaces(), staleTime: 60 * 1000 })
      .then((overview) => setActivity(overview.workspaces.find((w) => w.id === id) || null))
      .catch(() => { /* the activity rows just show a dash */ });
    qc.fetchQuery({ queryKey: ["admin", "plan-pricings"], queryFn: () => base44.entities.PlanPricing.list(), staleTime: 5 * 60 * 1000 })
      .then((all) => setPricings((all || []).filter((p) => p.is_active)))
      .catch(() => {});
    try {
      // After an action, a request that started before it must not answer for it: cancel it and ask again.
      if (fresh) await qc.cancelQueries({ queryKey: adminWorkspaceDetailsKey(id) });
      const details = await qc.fetchQuery({
        queryKey: adminWorkspaceDetailsKey(id),
        queryFn: () => fetchAdminWorkspaceDetails(id),
        staleTime: fresh || !cached ? 0 : 30 * 1000,
      });
      if (seq === loadSeq.current) setData(details);
    } catch (e) {
      if (isCancelledError(e) || seq !== loadSeq.current) return; // replaced by a newer load
      setError(e?.message || "Failed to load workspace");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doAssign = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke("assignProSubscription", {
        workspace_id: id,
        pricing_id: assignForm.pricing_id,
        start_date: assignForm.start_date,
        note: assignForm.note,
        launch_offer: assignForm.launch,
        notify: assignForm.notify, // off = no "Pro is now active" email to the owner (e.g. fixing a mistake)
      });
      // Pro assigned here is always a gift: recorded at ₹0 (only Razorpay payments are revenue).
      const subId = (res?.data || res)?.subscription_id;
      // Pro is already assigned at this point, so a failure here must not leave the dialog open for a second Confirm
      // (that would add the period twice). Warn instead; the row just keeps the plan price (still shown as Gift).
      let giftWarning = "";
      if (!assignForm.launch && subId) {
        try {
          await base44.entities.WorkspaceSubscription.update(subId, {
            assigned_price: 0,
            note: `Gift — free Pro${assignForm.note ? ": " + assignForm.note : ""}`,
          });
        } catch {
          giftWarning = "Pro was given, but it couldn't be marked as ₹0. Don't assign again; it already shows as Gift and isn't counted as revenue.";
        }
      }
      setShowAssign(false);
      // Pro is active now, so close this workspace's pending upgrade requests (best effort).
      try { await reviewAdminUpgradeRequests({ workspaceId: id, status: "APPROVED" }); } catch { /* request list can be cleared by hand */ }
      // The dashboard's revenue graph and request list pick this up at once.
      qc.invalidateQueries({ queryKey: ["admin"] });
      await load({ fresh: true });
      if (giftWarning) setError(giftWarning);
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
      qc.invalidateQueries({ queryKey: ["admin"] });
      await load({ fresh: true });
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
      const res = await base44.functions.invoke("adminSetWorkspaceStatus", { workspace_id: id, status: target });
      // Flip the button at once from the server's answer, then reload the full details.
      if (res?.plan_status) setData((d) => d && { ...d, plan: { ...d.plan, plan_status: res.plan_status } });
      qc.invalidateQueries({ queryKey: ["admin"] });
      await load({ fresh: true });
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
      // Gone from the list at once (no waiting for the cache), and its saved details are dropped.
      qc.removeQueries({ queryKey: adminWorkspaceDetailsKey(id) });
      qc.setQueryData(["admin", "workspaces"], (d) => d && { ...d, workspaces: d.workspaces.filter((w) => w.id !== id), total: Math.max(0, (d.total || 1) - 1) });
      qc.invalidateQueries({ queryKey: ["admin"] });
      navigate("/admin/workspaces", { replace: true });
    } catch (e) {
      setError(e?.message || "Failed to delete workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const openReceipt = async (subId) => {
    const b = billing[subId];
    if (!b?.receipt) return;
    setPdf({ open: true, url: "", filename: "", loading: true, id: subId });
    try {
      const ws = data?.workspace || {};
      const out = await generateSubscriptionReceiptPdf({
        payment: { billing_cycle_snapshot: b.sub.billing_cycle_snapshot, ...b.receipt },
        subscription: b.sub,
        workspace: { name: ws.name, email: ws.email, phone: ws.phone, city: ws.city, state: ws.state, ...(billing.__workspace || {}) },
      });
      setPdf((x) => {
        if (x.id !== subId || !x.open) { setTimeout(() => URL.revokeObjectURL(out.url), 1000); return x; } // closed meanwhile
        return { open: true, ...out, loading: false, id: subId };
      });
    } catch (e) {
      setPdf({ open: false, url: "", filename: "", loading: false, id: null });
      setError(e?.message || "Couldn't make the receipt");
    }
  };

  const openAssign = () => {
    setAssignForm({ pricing_id: pricings[0]?.id || "", start_date: new Date().toISOString().split("T")[0], note: "", launch: false, notify: true });
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
            <h1 className="text-lg font-semibold flex items-center gap-2 flex-wrap break-words [overflow-wrap:anywhere]">
              {workspace.name}
              {subscriptions.some((s) => s.source === "PROMOTIONAL") && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">Early supporter</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{workspace.business_type || "—"} · {workspace.city || "—"}, {workspace.country || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap [&>*:last-child:nth-child(odd)]:col-span-2">
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
            <Trash2 className="w-3.5 h-3.5" /> <span className="sm:hidden">Delete</span><span className="hidden sm:inline">Delete User & Workspace</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Business">
          <Row label="Owner" value={workspace.owner_name} />
          <Row label="Email" value={workspace.owner_email} plain />
          <Row label="Phone" value={workspace.phone || "—"} plain />
          <Row label="Currency" value={workspace.currency || "—"} />
          <Row label="GST Enabled" value={workspace.gst_enabled ? "Yes" : "No"} />
          <Row label="Created" value={workspace.created_date ? new Date(workspace.created_date).toLocaleDateString() : "—"} />
          <Row label="Last active" value={formatLastSeen(activity?.last_active_at)} />
          <Row label="Last sign-in" value={formatLastSeen(activity?.last_sign_in_at)} />
          <Row label="Signs in with" value={formatSignInMethods(activity?.sign_in_methods)} plain />
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
          <UsageCard label="Work items" value={usage.events} />
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
          <div className="divide-y divide-border">
            {subscriptions.map((s) => {
              const kind = SOURCE_KIND[s.source] || { label: s.source || "—", icon: Crown, tone: "bg-muted text-muted-foreground" };
              const Icon = kind.icon;
              const st = subStatus(s);
              const isPaid = s.source === "PAYMENT_GATEWAY";
              const isFree = s.source === "ONBOARDING";
              const cycle = BILLING_LABELS[s.billing_cycle_snapshot] || "";
              const note = cleanNote(s.note);
              const b = billing[s.id];
              return (
                <div key={s.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${kind.tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{isFree ? "Free plan" : `Pro${cycle ? " · " + cycle : ""}`}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                    </div>
                    {!isFree && (s.started_at || s.expires_at) && (
                      <div className="text-xs text-muted-foreground mt-0.5">{fmtDay(s.started_at)} → {fmtDay(s.expires_at)}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
                      {kind.label}{b?.by && b.by !== "—" && !isPaid && !isFree ? ` by ${b.by}` : ""}
                      {s.created_date ? ` · ${new Date(s.created_date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                    {note && <div className="text-xs text-muted-foreground mt-0.5 italic break-words">“{note}”</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {isPaid
                      ? <span className="text-sm text-foreground tabular-nums">₹{Number(s.assigned_price || 0).toLocaleString("en-IN")}</span>
                      : isFree
                        ? <span className="text-sm text-muted-foreground">—</span>
                        : <span className="text-sm font-medium text-primary">Gift</span>}
                    {b?.receipt && (
                      <button
                        type="button"
                        onClick={() => openReceipt(s.id)}
                        disabled={pdf.loading}
                        title="Payment receipt (PDF)"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 min-h-8 text-xs font-medium text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      >
                        {pdf.loading && pdf.id === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />} Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <PdfPreviewModal url={pdf.url} filename={pdf.filename} open={pdf.open} loading={pdf.loading} onClose={() => setPdf((x) => { if (x.url) setTimeout(() => URL.revokeObjectURL(x.url), 1000); return { ...x, open: false, url: "", id: null }; })} />

      {/* Assign/Renew Pro dialog */}
      <AppDialog open={showAssign} onOpenChange={(o) => !o && setShowAssign(false)}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>{isPro ? "Renew Pro" : "Assign Pro"}</AppDialogTitle>
            <AppDialogDescription>A gift: Pro is given free (recorded as ₹0, not revenue). Pick how long and the start date.</AppDialogDescription>
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
              <Input value={assignForm.note} onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))} placeholder="Reason for the gift" />
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-border p-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={assignForm.notify} onChange={(e) => setAssignForm((f) => ({ ...f, notify: e.target.checked }))} />
              <span className="text-sm">
                <span className="font-medium">Email the owner</span>
                <span className="block text-xs text-muted-foreground">Sends "Kramasha Pro is now active" from contact@kramasha.com. Untick when fixing a mistake.</span>
              </span>
            </label>
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

// Long values (emails) wrap instead of running off a phone screen; only words like "active" are capitalised.
function Row({ label, value, plain = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right min-w-0 break-words [overflow-wrap:anywhere] ${plain ? "" : "capitalize"}`}>{value}</span>
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