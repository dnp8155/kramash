import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import ServiceProviderAutocomplete from "@/components/team/ServiceProviderAutocomplete";
import { todayStr } from "@/utils/team";
import { dateRange } from "@/utils/dates";
import { paymentMethods } from "@/constants/finance";
import { formatCurrency, formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import SelfBadge from "@/components/common/SelfBadge";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { isSelfMember } from "@/utils/selfDetection";

// Assign/Edit Service modal — creates or updates an EventServiceAssignment.
//
// Service Provider is an autocomplete field: existing workspace Team Members
// and the event's Client appear as suggestions. Custom provider names can be
// typed freely — on save, a new TeamMember record is created so the provider
// appears in future suggestions. Deduplication is case-insensitive.
//
// Rate auto-populates from the master Service.default_rate but is editable
// (event-specific override — does NOT modify the master service).
//
// Provider can be "Client" (the event's client) or any Team Member.
// When provider is "Client", payments are CLIENT_RECEIPT (money in).
// When provider is a Team Member, payments are BUSINESS_EXPENSE (money out).
// When provider is SELF (workspace owner), no external payment is created.
export default function AssignServiceModal({
  open,
  onClose,
  event,
  client,
  members,
  services,
  existingServiceIds = [],
  editingAssignment = null,
  onAssign,
  onUpdate,
  onRecordPayment,
  onCreateProvider,
  selfAlreadyAssigned = false,
}) {
  // Provider resolution: { providerId, providerName, isCustom }
  const [provider, setProvider] = useState({
    providerId: null,
    providerName: "",
    isCustom: false,
  });
  const [serviceId, setServiceId] = useState("");
  const [rate, setRate] = useState("");
  const [isAddon, setIsAddon] = useState(false);
  const [workingDates, setWorkingDates] = useState([]);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingAssignment;
  const { ownerName } = useWorkspace();

  const eventDates = useMemo(() => {
    if (!event?.start_date) return [];
    return dateRange(event.start_date, event.end_date);
  }, [event?.start_date, event?.end_date]);

  // SELF detection: check if the selected provider name matches the owner.
  // Works for both existing members and custom-typed names.
  const isSelfProviderSelected =
    !!provider.providerId &&
    provider.providerId !== "client" &&
    isSelfMember(provider.providerName, ownerName);

  // Initialize form state when modal opens or editingAssignment changes.
  useEffect(() => {
    if (!open) return;
    if (isEditing && editingAssignment) {
      // Resolve the provider from the assignment's stored data.
      if (editingAssignment.provider_id === "client") {
        setProvider({
          providerId: "client",
          providerName: client?.name || editingAssignment.provider_name_snapshot || "Client",
          isCustom: false,
        });
      } else if (editingAssignment.provider_id) {
        const member = members.find((m) => m.id === editingAssignment.provider_id);
        setProvider({
          providerId: editingAssignment.provider_id,
          providerName: member?.name || editingAssignment.provider_name_snapshot || "",
          isCustom: false,
        });
      } else if (editingAssignment.provider_name_snapshot) {
        // Legacy custom provider with no member record — treat as custom.
        setProvider({
          providerId: null,
          providerName: editingAssignment.provider_name_snapshot,
          isCustom: true,
        });
      } else {
        setProvider({ providerId: null, providerName: "", isCustom: false });
      }
      setServiceId(editingAssignment.service_id || "");
      setRate(editingAssignment.rate != null ? String(editingAssignment.rate) : "");
      setIsAddon(!!editingAssignment.is_addon);
      setWorkingDates(editingAssignment.working_dates || []);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    } else {
      setProvider({ providerId: null, providerName: "", isCustom: false });
      setServiceId("");
      setRate("");
      setIsAddon(false);
      setWorkingDates([]);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    }
  }, [open, editingAssignment, event?.id, members, client]);

  const availableServices = useMemo(() => {
    if (isEditing) {
      return services.filter((s) => s.status === "active");
    }
    return services.filter(
      (s) => s.status === "active" && !existingServiceIds.includes(s.id)
    );
  }, [services, existingServiceIds, isEditing]);

  const handleServiceChange = (id) => {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    setRate(service?.default_rate != null ? String(service.default_rate) : "");
  };

  const handleWorkingDateToggle = (date) => {
    setWorkingDates((prev) =>
      prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort()
    );
  };

  const handleSave = async () => {
    if (!serviceId) {
      toast({ title: "Select a service", variant: "destructive" });
      return;
    }
    const amt = Number(rate);
    if (!rate || Number.isNaN(amt) || amt < 0) {
      toast({ title: "Enter a valid rate", variant: "destructive" });
      return;
    }

    const payAmt = Number(paymentAmount);
    if (!isEditing && recordPayment) {
      if (!paymentAmount || Number.isNaN(payAmt) || payAmt <= 0) {
        toast({ title: "Enter a valid payment amount", variant: "destructive" });
        return;
      }
      if (!paymentDate) {
        toast({ title: "Select a payment date", variant: "destructive" });
        return;
      }
    }

    const service = services.find((s) => s.id === serviceId);

    setSaving(true);
    try {
      // Resolve the final provider ID and name.
      // If a custom provider was typed, create a TeamMember record first so
      // it persists in the workspace and appears in future suggestions.
      let finalProviderId = provider.providerId;
      let finalProviderName = provider.providerName;

      if (provider.isCustom && finalProviderName && onCreateProvider) {
        try {
          const newMember = await onCreateProvider({ name: finalProviderName });
          finalProviderId = newMember.id;
          finalProviderName = newMember.name;
        } catch (createErr) {
          toast({
            title: "Could not create provider",
            description: createErr?.message,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      const payload = {
        service_id: serviceId,
        service_name_snapshot: service?.name || "",
        provider_id: finalProviderId || null,
        provider_name_snapshot: finalProviderName || "",
        rate: amt,
        is_addon: isAddon,
        working_dates: workingDates.length > 0 ? workingDates : null,
      };

      if (isEditing) {
        await onUpdate(editingAssignment.id, payload);
        toast({ title: "Service updated" });
        onClose();
        return;
      }

      // Create the service assignment first.
      const assignment = await onAssign(payload);

      // Then create payment if Record Payment is ON (add mode only, non-SELF).
      if (recordPayment && onRecordPayment && assignment) {
        const txnType =
          finalProviderId === "client" ? "CLIENT_RECEIPT" : "BUSINESS_EXPENSE";
        try {
          await onRecordPayment({
            transaction_type: txnType,
            event_id: event.id,
            service_assignment_id: assignment.id,
            client_id: finalProviderId === "client" ? event.client_id : null,
            team_member_id:
              finalProviderId !== "client" && finalProviderId
                ? finalProviderId
                : null,
            amount: payAmt,
            payment_method: paymentMethod,
            transaction_date: paymentDate,
          });
          toast({ title: "Service assigned and payment recorded" });
        } catch (paymentErr) {
          toast({
            title: "Service assigned — payment failed",
            description: paymentErr?.message,
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Service assigned" });
      }
      onClose();
    } catch (e) {
      toast({
        title: isEditing ? "Update failed" : "Assignment failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Service" : "Assign Service"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <ServiceProviderAutocomplete
          label="Service Provider"
          value={provider}
          onChange={setProvider}
          members={members}
          client={client}
          ownerName={ownerName}
          selfAlreadyAssigned={selfAlreadyAssigned}
          isEditing={isEditing}
          editingProviderId={editingAssignment?.provider_id}
        />
        {!isEditing && selfAlreadyAssigned && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Owner / Self is already assigned to this event.
          </p>
        )}

        <Select
          label="Service"
          value={serviceId}
          onChange={(e) => handleServiceChange(e.target.value)}
        >
          <option value="">Select a service…</option>
          {availableServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.default_rate != null ? ` — ${formatCurrency(s.default_rate)}` : ""}
            </option>
          ))}
        </Select>
        {!isEditing && availableServices.length === 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">
            No services available. Add services in Preferences.
          </p>
        )}

        <Input
          label="Rate (event-specific)"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0"
        />
        {serviceId && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Master service rate is not modified — this override applies only to
            this event.
          </p>
        )}

        {eventDates.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Working Dates (optional)
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Leave empty to apply this service to all event dates. Select
              specific dates to limit coverage.
            </p>
            <div className="flex flex-wrap gap-2">
              {eventDates.map((date) => (
                <label
                  key={date}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                    workingDates.includes(date)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={workingDates.includes(date)}
                    onChange={() => handleWorkingDateToggle(date)}
                    className="h-3.5 w-3.5"
                  />
                  {formatDate(date)}
                </label>
              ))}
            </div>
          </div>
        )}

        {!isEditing && isSelfProviderSelected && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-3">
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <SelfBadge /> Workspace owner — no payment required
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This provider is the workspace owner (SELF). The service amount is
              treated as the owner's internal profit share, not an external payable.
            </p>
          </div>
        )}

        {/* Add-on toggle */}
        <div className="rounded-lg border border-border p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={isAddon}
              onChange={(e) => setIsAddon(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Add-on (last-minute request)
          </label>
          {isAddon && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              This amount will be added on top of the contract value.
            </p>
          )}
        </div>

        {/* Record Payment toggle (add mode only) — hidden for SELF provider */}
        {!isEditing && onRecordPayment && !isSelfProviderSelected && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(e) => setRecordPayment(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Record Payment Now
            </label>
            {recordPayment && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}