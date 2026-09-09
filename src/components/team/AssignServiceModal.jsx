import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { todayStr } from "@/utils/team";
import { paymentMethods } from "@/constants/finance";
import { toast } from "@/components/ui/use-toast";

// Assign Service modal — creates an EventServiceAssignment.
// Rate auto-populates from the master Service.default_rate but is editable
// (event-specific override — does NOT modify the master service).
export default function AssignServiceModal({
  open,
  onClose,
  event,
  members,
  services,
  existingServiceIds = [],
  onAssign,
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

  useEffect(() => {
    if (open) {
      setProviderId("");
      setServiceId("");
      setRate("");
      setIsAddon(false);
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentDate(todayStr());
      setPaymentMethod("Cash");
    }
  }, [open, event?.id]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "Active"),
    [members]
  );

  const availableServices = useMemo(
    () =>
      services.filter(
        (s) => s.status === "active" && !existingServiceIds.includes(s.id)
      ),
    [services, existingServiceIds]
  );

  const handleServiceChange = (id) => {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    setRate(service?.default_rate ?? "");
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

    // Validate payment fields if Record Payment is ON
    const payAmt = Number(paymentAmount);
    if (recordPayment && (!paymentAmount || Number.isNaN(payAmt) || payAmt <= 0)) {
      toast({ title: "Enter a valid payment amount", variant: "destructive" });
      return;
    }
    if (recordPayment && !paymentDate) {
      toast({ title: "Select a payment date", variant: "destructive" });
      return;
    }

    const service = services.find((s) => s.id === serviceId);
    const provider = members.find((m) => m.id === providerId);

    setSaving(true);
    try {
      const assignment = await onAssign({
        service_id: serviceId,
        service_name_snapshot: service?.name || "",
        provider_id: providerId || null,
        provider_name_snapshot: provider?.name || "",
        rate: amt,
        is_addon: isAddon,
      });

      // Create payment transaction if Record Payment is ON.
      // financial_year_id is auto-assigned by createTransaction from the
      // payment date — NOT from the UI-selected FY.
      if (recordPayment && onRecordPayment && assignment) {
        await onRecordPayment({
          transaction_type: "BUSINESS_EXPENSE",
          event_id: event.id,
          amount: payAmt,
          payment_method: paymentMethod,
          transaction_date: paymentDate,
        });
        toast({ title: "Service assigned and payment recorded" });
      } else {
        toast({ title: "Service assigned" });
      }
      onClose();
    } catch (e) {
      toast({ title: "Assignment failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Service"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
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
              {s.default_rate != null ? ` — ₹${s.default_rate}` : ""}
            </option>
          ))}
        </Select>
        {availableServices.length === 0 && (
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

        {/* Record Payment toggle */}
        {onRecordPayment && (
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