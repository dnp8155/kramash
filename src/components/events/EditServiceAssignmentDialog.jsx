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
import { formatMoney } from "@/utils/format";
import { isSelfMember } from "@/lib/teamService";
import ServiceProviderAutocomplete from "@/components/events/ServiceProviderAutocomplete";
import {
  normalizeProviderName,
  ensureServiceProvider,
  buildProviderSuggestions
} from "@/lib/serviceProviderService";
import { Crown } from "lucide-react";

// Edit an existing Event Service Assignment.
// Edits: provider, service, rate, rate type, add-on, notes.
// Does NOT modify the master Service configuration — only the event-specific assignment.
// Existing payment transactions are preserved (rate changes recalculate remaining).
export default function EditServiceAssignmentDialog({
  open, onClose, onSaved,
  assignment, event, workspaceId, currency = "INR",
  services = [], members = [], providers = []
}) {
  const [provider, setProvider] = useState({ id: "", name: "", type: "custom" });
  const [serviceId, setServiceId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Fixed");
  const [isAddon, setIsAddon] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(
    () => buildProviderSuggestions(members, providers),
    [members, providers]
  );

  const selectedMember = provider.type === "member" ? members.find((m) => m.id === provider.id) : null;
  const isSelf = isSelfMember(selectedMember);

  // Pre-fill form when the dialog opens with an existing assignment
  useEffect(() => {
    if (open && assignment) {
      setError("");
      setServiceId(assignment.service_id || "");
      setAgreedRate(String(assignment.agreed_rate ?? ""));
      setRateType(assignment.rate_type || "Fixed");
      setIsAddon(!!assignment.is_addon);
      setNotes(assignment.notes || "");

      // Determine provider type from the assignment
      if (assignment.provider_id) {
        const member = members.find((m) => m.id === assignment.provider_id);
        if (member) {
          setProvider({ id: member.id, name: member.name, type: "member" });
        } else {
          // provider_id references a deleted member — treat as custom
          setProvider({ id: "", name: assignment.provider_name_snapshot || "", type: "custom" });
        }
      } else {
        setProvider({ id: "", name: assignment.provider_name_snapshot || "", type: "custom" });
      }
    }
  }, [open, assignment, members]);

  const onServiceChange = (id) => {
    setServiceId(id);
    // Don't auto-overwrite the rate on edit — the user may have a custom event rate.
    // Only set if the current rate is empty.
    if (agreedRate === "") {
      const svc = services.find((s) => s.id === id);
      if (svc) {
        setAgreedRate(String(svc.default_rate || 0));
        setRateType(svc.rate_type || "Fixed");
      }
    }
  };

  const validate = () => {
    if (!serviceId) return "Please select a service.";
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return "Rate must be a valid non-negative number.";
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
        service_id: serviceId,
        service_name_snapshot: svc?.name || assignment?.service_name_snapshot || "",
        provider_id: provider.type === "member" ? provider.id : "",
        provider_name_snapshot: providerName,
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        is_addon: isAddon,
        notes: notes.trim()
      };
      const saved = await base44.entities.EventServiceAssignment.update(assignment.id, payload);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to update service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            {event ? event.title : "Update this service assignment."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Service Provider */}
          <div className="space-y-1.5">
            <Label>Service Provider</Label>
            <ServiceProviderAutocomplete
              value={provider}
              onChange={setProvider}
              suggestions={suggestions}
              placeholder="Type or select a provider…"
            />
            <p className="text-xs text-muted-foreground">
              Select an existing provider or type a new one. Custom providers are saved to your workspace for future use.
            </p>
            {isSelf && (
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
              {services.filter((s) => s.status === "active" || s.id === serviceId).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
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
                    Master rate: {formatMoney(masterRate, currency)}
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
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assignment notes (optional)" />
          </div>

          {/* Rate-change safety note */}
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Changing the rate recalculates the remaining balance. Existing payment records are preserved.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}