import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import { formatMoney } from "@/utils/format";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { Wallet, Plus } from "lucide-react";

export default function AssignServiceDialog({
  open, onClose, onSaved,
  event, workspaceId,
  services = [], members = [],
  existingAssignments = []
}) {
  const [serviceId, setServiceId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Fixed");
  const [isAddon, setIsAddon] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Record Payment
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const { fiscalYears } = useFinancialYear();

  useEffect(() => {
    if (open) {
      setError("");
      setServiceId("");
      setProviderId("");
      setAgreedRate("");
      setRateType("Fixed");
      setIsAddon(false);
      setNotes("");
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(event?.start_date || "");
      setPaymentMethod("Cash");
    }
  }, [open, event]);

  const onServiceChange = (id) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setAgreedRate(String(svc.default_rate || 0));
      setRateType(svc.rate_type || "Fixed");
    }
  };

  const validate = () => {
    if (!serviceId) return "Please select a service.";
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return "Rate must be a valid non-negative number.";
    if (recordPayment) {
      const pAmt = Number(paymentAmount);
      if (!paymentAmount || isNaN(pAmt) || pAmt <= 0) return "Payment amount must be greater than zero.";
      if (!paymentDate) return "Please select a payment date.";
      if (!paymentMethod) return "Please select a payment method.";
      const fy = resolveFYForDate(paymentDate, fiscalYears);
      if (!fy) return "No Financial Year is available for this payment date. Please create the applicable Financial Year first.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      const svc = services.find((s) => s.id === serviceId);
      const provider = members.find((m) => m.id === providerId);
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        service_id: serviceId,
        service_name_snapshot: svc?.name || "",
        provider_id: providerId || "",
        provider_name_snapshot: provider?.name || "",
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        is_addon: isAddon,
        assignment_status: "assigned",
        notes: notes.trim()
      };
      const saved = await base44.entities.EventServiceAssignment.create(payload);
      // Sync event.service_ids
      const currentIds = Array.isArray(event?.service_ids) ? event.service_ids : [];
      if (!currentIds.includes(serviceId)) {
        await base44.entities.Event.update(event.id, {
          service_ids: [...currentIds, serviceId]
        });
      }
      // Record payment if enabled
      if (recordPayment) {
        const fy = resolveFYForDate(paymentDate, fiscalYears);
        if (!fy) {
          setError("No Financial Year is available for this payment date. Please create the applicable Financial Year first.");
          setSaving(false);
          return;
        }
        await base44.entities.FinancialTransaction.create({
          workspace_id: workspaceId,
          financial_year_id: fy.id,
          event_id: event.id,
          transaction_type: "BUSINESS_EXPENSE",
          expense_category_name_snapshot: `Service: ${svc?.name || ""}`,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          transaction_date: paymentDate,
          notes: `Service payment: ${svc?.name || ""}${provider ? ` (${provider.name})` : ""}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
          status: "ACTIVE"
        });
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to assign service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            {event ? `${event.title}` : "Assign a service to this event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Service Provider */}
          <div className="space-y-1.5">
            <Label>Service Provider</Label>
            <Select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="w-full">
              <option value="">No specific provider</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.profession ? ` — ${m.profession}` : ""}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">The person or company responsible for this service.</p>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label>Service <span className="text-destructive">*</span></Label>
            <Select value={serviceId} onChange={(e) => onServiceChange(e.target.value)} className="w-full">
              <option value="">Select a service</option>
              {services.filter((s) => s.status === "active").map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {services.filter((s) => s.status === "active").length === 0 && (
              <p className="text-xs text-muted-foreground">No services available. Add services from the Services page.</p>
            )}
          </div>

          {/* Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rate (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={agreedRate}
                onChange={(e) => setAgreedRate(e.target.value)}
                placeholder="0"
              />
              {serviceId && (() => {
                const svc = services.find((s) => s.id === serviceId);
                const masterRate = svc?.default_rate || 0;
                const currentRate = Number(agreedRate) || 0;
                if (masterRate && currentRate !== masterRate) {
                  return (
                    <p className="text-[11px] text-muted-foreground">
                      Master rate: {formatMoney(masterRate, "INR")} · Event-specific override
                    </p>
                  );
                }
                return (
                  <p className="text-[11px] text-muted-foreground">
                    Loaded from master: {formatMoney(masterRate, "INR")}
                  </p>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full">
                <option value="Fixed">Fixed</option>
                <option value="Per Day">Per Day</option>
                <option value="Per Unit">Per Unit</option>
              </Select>
            </div>
          </div>

          {/* Add-on toggle */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">Add-on (last-minute request)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adds this amount on top of the contract value.
                </p>
              </div>
              <Toggle checked={isAddon} onChange={setIsAddon} label="Add-on" />
            </div>
            {isAddon && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-warning font-medium">
                  This service will be added to the contract value as an add-on.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assignment notes (optional)" />
          </div>

          {/* Record Payment toggle */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <Label className="cursor-pointer">Record Payment Now</Label>
              </div>
              <Toggle checked={recordPayment} onChange={setRecordPayment} label="Record Payment" />
            </div>
            {recordPayment && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Creates an expense transaction. Financial Year is auto-assigned from the payment date.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Amount (₹) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method <span className="text-destructive">*</span></Label>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full">
                    {PAYMENT_METHOD_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </div>
                {paymentDate && (() => {
                  const fy = resolveFYForDate(paymentDate, fiscalYears);
                  return fy ? (
                    <p className="text-xs text-muted-foreground">
                      Will be recorded under <span className="font-medium text-foreground">{fy.fy_id}</span> ({fy.label})
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">
                      No Financial Year covers this date. Create the applicable FY first.
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}