import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { todayStr } from "@/utils/team";
import { paymentMethods } from "@/constants/finance";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

// Assign/Edit Service modal — creates or updates an EventServiceAssignment.
// Rate auto-populates from the master Service.default_rate but is editable
// (event-specific override — does NOT modify the master service).
//
// Provider can be "Client" (the event's client) or any active Team Member.
// When provider is "Client", payments are CLIENT_RECEIPT (money in).
// When provider is a Team Member, payments are BUSINESS_EXPENSE (money out).
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
}) {
  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [rate, setRate] = useState("");
  const [isAddon, setIsAddon] = useState(false);
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingAssignment;

  useEffect(() => {
    if (!open) return;
    if (isEditing && editingAssignment) {
      setProviderId(editingAssignment.provider_id || "");
      setServiceId(editingAssignment.service_id || "");
      setRate(editingAssignment.rate != null ? String(editingAssignment.rate) : "");
      setIsAddon(!!editingAssignment.is_addon);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    } else {
      setProviderId("");
      setServiceId("");
      setRate("");
      setIsAddon(false);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    }
  }, [open, editingAssignment, event?.id]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "Active"),
    [members]
  );

  const availableServices = useMemo(() => {
    if (isEditing) {
      // In edit mode, show all active services (including the currently assigned one)
      return services.filter((s) => s.status === "active");
    }
    return services.filter(
      (s) => s.status === "active" && !existingServiceIds.includes(s.id)
    );
  }, [services, existingServiceIds, isEditing]);

  const handleServiceChange = (id) => {
    setServiceId(id);
    // Always auto-populate rate from the selected service's master default.
    // The user can then override it — the master rate is never modified.
    const service = services.find((s) => s.id === id);
    setRate(service?.default_rate != null ? String(service.default_rate) : "");
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

    // Validate payment fields if Record Payment is ON (add mode only)
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
    const provider = providerId === "client"
      ? { name: client?.name || "Client" }
      : members.find((m) => m.id === providerId);

    setSaving(true);
    try {
      const payload = {
        service_id: serviceId,
        service_name_snapshot: service?.name || "",
        provider_id: providerId || null,
        provider_name_snapshot: provider?.name || "",
        rate: amt,
        is_addon: isAddon,
      };

      if (isEditing) {
        await onUpdate(editingAssignment.id, payload);
        toast({ title: "Service updated" });
        onClose();
        return;
      }

      // Create the service assignment first
      const assignment = await onAssign(payload);

      // Then create payment if Record Payment is ON.
      // If payment fails (e.g. no FY for the date), the assignment is already
      // saved — show a specific error so the user knows the assignment succeeded.
      if (recordPayment && onRecordPayment && assignment) {
        const txnType = providerId === "client" ? "CLIENT_RECEIPT" : "BUSINESS_EXPENSE";
        try {
          await onRecordPayment({
            transaction_type: txnType,
            event_id: event.id,
            service_assignment_id: assignment.id,
            client_id: providerId === "client" ? event.client_id : null,
            team_member_id: providerId !== "client" && providerId ? providerId : null,
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
      toast({ title: isEditing ? "Update failed" : "Assignment failed", description: e?.message, variant: "destructive" });
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
        <Select
          label="Service Provider"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
        >
          <option value="">Select a provider…</option>
          {client && (
            <option value="client">Client — {client.name}</option>
          )}
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.profession ? ` — ${m.profession}` : ""}
            </option>
          ))}
        </Select>

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

        {/* Record Payment toggle (add mode only) */}
        {!isEditing && onRecordPayment && (
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