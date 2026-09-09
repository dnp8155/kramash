import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Building2, Mail, Phone, Calendar, TrendingDown, Pause, Play, Loader2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import Modal from "@/components/common/Modal";
import AssignPlanModal from "@/components/admin/AssignPlanModal";
import { base44 } from "@/api/base44Client";
import { usePlans } from "@/hooks/usePlans";
import { fetchWorkspaceUsage } from "@/hooks/useAdminData";
import { getCurrentSubscription, getEffectivePlanCode, isSubscriptionActive } from "@/utils/plan";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

export default function AdminWorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { plans, pricings, limits, loading: plansLoading } = usePlans();
  const [workspace, setWorkspace] = useState(null);
  const [owner, setOwner] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = await base44.entities.Workspace.get(id);
      setWorkspace(ws);
      // Fetch owner
      if (ws.owner_user_id) {
        try {
          const ownerUser = await base44.entities.User.get(ws.owner_user_id);
          setOwner(ownerUser);
        } catch { /* non-blocking */ }
      }
      // Fetch subscriptions for this workspace
      const subs = await base44.entities.WorkspaceSubscription.filter(
        { workspace_id: id },
        "-created_date",
        10
      );
      setSubscription(getCurrentSubscription(subs, id));
      // Fetch payment history
      const pays = await base44.entities.SubscriptionPayment.filter(
        { workspace_id: id },
        "-created_date",
        20
      );
      setPayments(pays || []);
      // Fetch usage
      const u = await fetchWorkspaceUsage(id);
      setUsage(u);
    } catch (e) {
      setError(e?.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const proPricings = pricings.filter((p) => {
    const plan = plans.find((pl) => pl.id === p.plan_id);
    return plan?.code === "PRO" && p.is_active;
  });

  const effectivePlanCode = getEffectivePlanCode(subscription);
  const isActive = isSubscriptionActive(subscription);

  const handleAction = async (action, payload = {}) => {
    setActionLoading(action);
    try {
      const res = await base44.functions.invoke("manageSubscription", {
        action,
        workspace_id: id,
        ...payload,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: `Subscription ${action} completed.` });
      await load();
    } catch (e) {
      toast({ title: "Action failed", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async () => {
    setShowDowngrade(false);
    await handleAction("downgrade_to_free");
  };

  if (loading) return <LoadingState label="Loading workspace…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!workspace) return <ErrorState message="Workspace not found" />;

  const planLabel = effectivePlanCode === "PRO" ? "Pro" : "Free";

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate("/admin/workspaces")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Workspaces
      </button>

      <PageHeader title={workspace.name} description={`Workspace details and plan management.`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Business Info */}
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-foreground">{workspace.business_type || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Owner:</span>
              <span className="font-medium text-foreground">{owner?.full_name || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground">{owner?.email || workspace.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium text-foreground">{workspace.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium text-foreground">{formatDate(workspace.created_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium text-foreground">{[workspace.city, workspace.state, workspace.country].filter(Boolean).join(", ") || "—"}</span>
            </div>
          </CardBody>
        </Card>

        {/* Plan Info */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <div className="flex items-center gap-2">
              <Crown className={`h-4 w-4 ${effectivePlanCode === "PRO" ? "text-warning" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${effectivePlanCode === "PRO" ? "text-warning" : "text-muted-foreground"}`}>
                {planLabel}
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={subscription?.status || "NONE"} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span className="font-medium text-foreground">
                {subscription?.billing_cycle_snapshot === "MONTHLY" ? "Monthly"
                  : subscription?.billing_cycle_snapshot === "SIX_MONTHS" ? "6 Months"
                  : subscription?.billing_cycle_snapshot === "ANNUAL" ? "Annual"
                  : subscription?.billing_cycle_snapshot === "FREE" ? "Free"
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium text-foreground">{subscription?.started_at ? formatDate(subscription.started_at) : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expiry</span>
              <span className="font-medium text-foreground">{subscription?.expires_at ? formatDate(subscription.expires_at) : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Assigned Price</span>
              <span className="font-medium text-foreground">
                {subscription?.assigned_price != null ? formatCurrency(subscription.assigned_price) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium text-foreground">{subscription?.source || "—"}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Usage */}
      <Card>
        <CardHeader><CardTitle>Resource Usage</CardTitle></CardHeader>
        <CardBody>
          {usage ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-foreground">{usage.events}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-foreground">{usage.team_members}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-foreground">{usage.services}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading usage…</p>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle>Plan Management</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {effectivePlanCode === "FREE" ? (
            <Button onClick={() => setShowAssign(true)} disabled={actionLoading !== null || proPricings.length === 0}>
              <Crown className="h-4 w-4" /> Assign Pro Plan
            </Button>
          ) : (
            <Button onClick={() => setShowAssign(true)} disabled={actionLoading !== null || proPricings.length === 0}>
              <Crown className="h-4 w-4" /> Renew Pro
            </Button>
          )}

          {effectivePlanCode === "PRO" && (
            <Button variant="outline" onClick={() => setShowDowngrade(true)} disabled={actionLoading !== null}>
              <TrendingDown className="h-4 w-4" /> Downgrade to Free
            </Button>
          )}

          {isActive && (
            <Button variant="outline" onClick={() => handleAction("suspend")} disabled={actionLoading !== null}>
              {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />} Suspend
            </Button>
          )}

          {subscription?.status === "SUSPENDED" && (
            <Button variant="outline" onClick={() => handleAction("reactivate")} disabled={actionLoading !== null}>
              {actionLoading === "reactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Reactivate
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Billing Cycle</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Gateway</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-foreground">{formatDate(p.created_date)}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.billing_cycle_snapshot === "MONTHLY" ? "Monthly"
                          : p.billing_cycle_snapshot === "SIX_MONTHS" ? "6 Months"
                          : p.billing_cycle_snapshot === "ANNUAL" ? "Annual"
                          : p.billing_cycle_snapshot || "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.gateway || "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Assign/Renew Modal */}
      <AssignPlanModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onAssigned={() => load()}
        workspaceId={id}
        pricings={proPricings}
        mode={effectivePlanCode === "PRO" ? "renew" : "assign"}
      />

      {/* Downgrade Confirmation */}
      <Modal open={showDowngrade} onClose={() => setShowDowngrade(false)} title="Downgrade to Free" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will downgrade <span className="font-semibold text-foreground">{workspace.name}</span> to the Free plan.
          </p>
          <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Existing workspace data will not be deleted.</p>
            <p className="mt-1">Free Plan limits will apply. The workspace can still view existing records but cannot create new resources beyond Free limits.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDowngrade(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDowngrade} disabled={actionLoading !== null}>
              {actionLoading === "downgrade_to_free" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />} Confirm Downgrade
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}