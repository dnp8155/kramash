import { useState, useEffect } from "react";
import { Calendar, Crown, Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/utils/format";

// Modal for admin to assign or renew a Pro subscription.
// Props: open, onClose, onAssigned, workspaceId, pricings (Pro pricing options)
export default function AssignPlanModal({ open, onClose, onAssigned, workspaceId, pricings, mode = "assign" }) {
  const [pricingId, setPricingId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPricingId(pricings[0]?.id || "");
      setStartDate(new Date().toISOString().slice(0, 10));
      setReason("");
      setError("");
    }
  }, [open, pricings]);

  const selectedPricing = pricings.find((p) => p.id === pricingId);

  const computeExpiry = (start, months) => {
    if (!start || !months) return "—";
    const d = new Date(start + "T00:00:00");
    const originalDay = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== originalDay) d.setDate(0);
    return d.toISOString().slice(0, 10);
  };

  const expiry = selectedPricing ? computeExpiry(startDate, selectedPricing.duration_months) : "—";

  const handleConfirm = async () => {
    if (!pricingId || !startDate) {
      setError("Please select a billing cycle and start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSubscription", {
        action: "assign",
        workspace_id: workspaceId,
        plan_code: "PRO",
        pricing_id: pricingId,
        start_date: startDate,
        reason: reason.trim(),
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      onAssigned?.(data);
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to assign plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "renew" ? "Renew Pro Subscription" : "Assign Pro Plan"} size="md">
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Billing Cycle</label>
          <Select value={pricingId} onChange={(e) => setPricingId(e.target.value)}>
            {pricings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.billing_cycle === "MONTHLY" ? "Monthly" : p.billing_cycle === "SIX_MONTHS" ? "6 Months" : "Annual"} — {formatCurrency(p.price)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Admin Note (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this assignment…"
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {selectedPricing && (
          <div className="rounded-lg border border-border bg-accent/30 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-warning" />
              <span className="font-medium text-foreground">Pro Plan — {formatCurrency(selectedPricing.price)}</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Start: {startDate}</span>
              <span>Expires: {expiry}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving || !pricingId || !startDate}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "renew" ? "Renew Pro" : "Assign Pro"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}