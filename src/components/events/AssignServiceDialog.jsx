import { useState, useEffect, useMemo } from "react";
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
import { isSelfMember } from "@/lib/teamService";
import {
  normalizeProviderName,
  ensureServiceProvider,
  buildProviderSuggestions
} from "@/lib/serviceProviderService";
import ServiceProviderAutocomplete from "@/components/events/ServiceProviderAutocomplete";
import { Wallet, Plus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssignServiceDialog({
  open, onClose, onSaved,
  event, workspaceId, currency = "INR",
  services = [], members = [],
  providers = [],
  existingAssignments = []
}) {
  const [provider, setProvider] = useState({ id: "", name: "", type: "custom" });
  const [serviceId, setServiceId] = useState("");
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

  const suggestions = useMemo(
    () => buildProviderSuggestions(members, providers),
    [members, providers]
  );

  const selectedMember = provider.type === "member" ? members.find((m) => m.id === provider.id) : null;
  const selectedProviderIsSelf = isSelfMember(selectedMember);

  // SELF duplicate prevention — only one owner-self provider per event
  const selfMember = useMemo(() => members.find((m) => isSelfMember(m)), [members]);
  const selfAlreadyProvider = useMemo(() => {
    if (!selfMember) return false;
    return (existingAssignments || []).some(
      (a) => a.provider_id === selfMember.id && a.assignment_status !== "removed"
    );
  }, [selfMember, existingAssignments]);

  // Filter out SELF from suggestions if already assigned as a provider for this event
  const filteredSuggestions = useMemo(() => {
    if (!selfAlreadyProvider) return suggestions;
    return suggestions.filter((s) => !s.isSelf);
  }, [suggestions, selfAlreadyProvider]);

  useEffect(() => {
    if (open) {
      setError("");
      setProvider({ id: "", name: "", type: "custom" });
      setServiceId("");
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

  // Reset record payment when provider changes to Self
  useEffect(() => {
    if (selectedProviderIsSelf) setRecordPayment(false);
  }, [selectedProviderIsSelf]);

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
      const providerName = normalizeProviderName(provider.name);

      // If a custom provider was entered, save it to the ServiceProvider master
      // so it appears in future suggestions (dedup is handled inside ensureServiceProvider).
      if (provider.type === "custom" && providerName) {
        await ensureServiceProvider(workspaceId, providerName, providers);
      }

      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        service_id: serviceId,
        service_name_snapshot: svc?.name || "",
        provider_id: provider.type === "member" ? provider.id : "",
        provider_name_snapshot: providerName,
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
      // Record payment if enabled (routed through backend for SELF guard)
      if (recordPayment) {
        const fy = resolveFYForDate(paymentDate, fiscalYears);
        if (!fy) {
          setError("No Financial Year is available for this payment date. Please create the applicable Financial Year first.");
          setSaving(false);
          return;
        }
        await base44.functions.invoke("recordPayment", {
          kind: "service",
          workspace_id: workspaceId,
          event_id: event.id,
          service_assignment_id: saved.id,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          transaction_date: paymentDate,
          notes: `Service payment: ${svc?.name || ""}${providerName ? ` (${providerName})` : ""}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
          financial_year_id: fy.id
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
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            {event ? `${event.title}` : "Assign a service to this event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Service Provider — autocomplete with custom entry */}
          <div className="space-y-1.5">
            <Label>Service Provider</Label>
            <ServiceProviderAutocomplete
              value={provider}
              onChange={setProvider}
              suggestions={filteredSuggestions}
              placeholder="Type or select a provider…"
            />
            <p className="text-xs text-muted-foreground">
              Select an existing provider or type a new one. Custom providers are saved to your workspace for future use.
            </p>
            {selfAlreadyProvider && (
              <p className="text-xs text-muted-foreground">
                Owner (Self) is already assigned as a provider for this event.
              </p>
            )}
            {selectedProviderIsSelf && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Crown className="w-3.5 h-3.5" />
                Workspace Owner (Self) — owner share, no external payment.
              </div>
            )}
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
              <Label>Rate ({currency}) <span className="text-destructive">*</span></Label>
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
                      Master rate: {formatMoney(masterRate, currency)} · Event-specific override
                    </p>
                  );
                }
                return (
                  <p className="text-[11px] text-muted-foreground">
                    Loaded from master: {formatMoney(masterRate, currency)}
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

          {/* Record Payment toggle — disabled when provider is Self (owner) */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <Label className={cn(!selectedProviderIsSelf && "cursor-pointer")}>Record Payment Now</Label>
              </div>
              <Toggle
                checked={recordPayment && !selectedProviderIsSelf}
                onChange={selectedProviderIsSelf ? () => {} : setRecordPayment}
                label="Record Payment"
              />
            </div>
            {selectedProviderIsSelf ? (
              <p className="text-xs text-muted-foreground">
                The workspace owner cannot be paid as a service provider — this is treated as owner share.
              </p>
            ) : recordPayment && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Creates an expense transaction. Financial Year is auto-assigned from the payment date.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Amount <span className="text-destructive">*</span></Label>
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