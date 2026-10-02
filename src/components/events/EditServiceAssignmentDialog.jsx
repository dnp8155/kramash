import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import DialogContextCard from "@/components/common/DialogContextCard";
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
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useT } from "@/hooks/useT";

export default function EditServiceAssignmentDialog({
  open, onClose, onSaved,
  assignment, event, workspaceId, currency = "INR",
  services = [], members = [], providers = []
}) {
  const t = useT();
  const [provider, setProvider] = useState({ id: "", name: "", type: "custom" });
  const [serviceId, setServiceId] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [rateType, setRateType] = useState("Fixed");
  const [isAddon, setIsAddon] = useState(false);
  const [notes, setNotes] = useState("");
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const suggestions = useMemo(
    () => buildProviderSuggestions(members, providers),
    [members, providers]
  );

  const selectedMember = provider.type === "member" ? members.find((m) => m.id === provider.id) : null;
  const isSelf = isSelfMember(selectedMember);

  useEffect(() => {
    if (open && assignment) {
      setError("");
      setServiceId(assignment.service_id || "");
      setAgreedRate(String(assignment.agreed_rate ?? ""));
      setRateType(assignment.rate_type || "Fixed");
      setIsAddon(!!assignment.is_addon);
      setNotes(assignment.notes || "");

      if (assignment.provider_id) {
        const member = members.find((m) => m.id === assignment.provider_id);
        if (member) {
          setProvider({ id: member.id, name: member.name, type: "member" });
        } else {
          setProvider({ id: "", name: assignment.provider_name_snapshot || "", type: "custom" });
        }
      } else {
        setProvider({ id: "", name: assignment.provider_name_snapshot || "", type: "custom" });
      }
    }
  }, [open, assignment, members]);

  const onServiceChange = (id) => {
    setServiceId(id);
    if (agreedRate === "") {
      const svc = services.find((s) => s.id === id);
      if (svc) {
        setAgreedRate(String(svc.default_rate || 0));
        setRateType(svc.rate_type || "Fixed");
      }
    }
  };

  const validate = () => {
    if (!serviceId) return t("Please select a service.");
    const amt = Number(agreedRate);
    if (agreedRate === "" || isNaN(amt) || amt < 0) return t("Rate must be a valid non-negative number.");
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!start()) return;
    setError("");
    try {
      const svc = services.find((s) => s.id === serviceId);
      const providerName = normalizeProviderName(provider.name);

      if (provider.type === "custom" && providerName) {
        await ensureServiceProvider(workspaceId, providerName, providers);
      }

      const payload = {
        service_id: serviceId,
        service_name_snapshot: svc?.name || assignment?.service_name_snapshot || "",
        provider_id: provider.type === "member" ? provider.id : null,
        provider_name_snapshot: providerName,
        agreed_rate: Number(agreedRate) || 0,
        rate_type: rateType,
        is_addon: isAddon,
        notes: notes.trim()
      };
      const saved = await base44.entities.EventServiceAssignment.update(assignment.id, payload);
      invalidateEntity(queryClient, "EventServiceAssignment");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || t("Failed to update service. Please try again."));
    } finally {
      stop();
    }
  };

  if (!assignment) return null;

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{t("Edit Service")}</AppDialogTitle>
          <AppDialogDescription>
            {t("Update this service assignment.")}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <DialogContextCard event={event} />
          <div className="space-y-1.5">
            <Label>{t("Service Provider")}</Label>
            <ServiceProviderAutocomplete
              value={provider}
              onChange={setProvider}
              suggestions={suggestions}
              placeholder={t("Type or select a provider…")}
            />
            <p className="text-xs text-muted-foreground">
              {t("Select an existing provider or type a new one. Custom providers are saved to your workspace for future use.")}
            </p>
            {isSelf && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Crown className="w-3.5 h-3.5" />
                {t("Workspace Owner (Self) — owner share, no external payment.")}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("Service")} <span className="text-destructive">*</span></Label>
            <Select value={serviceId} onChange={(e) => onServiceChange(e.target.value)} className="w-full">
              <option value="">{t("Select a service")}</option>
              {services.filter((s) => s.status === "active" || s.id === serviceId).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Rate")} ({currency}) <span className="text-destructive">*</span></Label>
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
                      {t("Master rate")}: {formatMoney(masterRate, currency)} · {t("Event-specific override")}
                    </p>
                  );
                }
                return (
                  <p className="text-[11px] text-muted-foreground">
                    {t("Master rate")}: {formatMoney(masterRate, currency)}
                  </p>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>{t("Rate Type")}</Label>
              <Select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full">
                <option value="Fixed">{t("Fixed")}</option>
                <option value="Per Day">{t("Per Day")}</option>
                <option value="Per Unit">{t("Per Unit")}</option>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">{t("Add-on (last-minute request)")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("Adds this amount on top of the contract value.")}
                </p>
              </div>
              <Toggle checked={isAddon} onChange={setIsAddon} label={t("Add-on")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Assignment notes (optional)")} />
          </div>

          <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t("Changing the rate recalculates the remaining balance. Existing payment records are preserved.")}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("Saving…") : t("Save Changes")}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}