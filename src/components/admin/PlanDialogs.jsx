import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";

const BILLING_LABELS = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Annual" };
const BILLING_DURATION = { MONTHLY: 1, SIX_MONTHS: 6, ANNUAL: 12 };

const LIMIT_KEYS = [
  { key: "max_events", label: "Max Events", type: "number" },
  { key: "max_team_members", label: "Max Team Members", type: "number" },
  { key: "max_services", label: "Max Services", type: "number" },
  { key: "pdf_export_enabled", label: "PDF Export", type: "boolean" },
  { key: "reminders_enabled", label: "Reminders", type: "boolean" }
];

export function CreatePlanDialog({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ code: "", name: "", description: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: "Code and Name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Plan.create({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: true
      });
      toast({ title: "Plan created" });
      onCreated?.(created);
      setForm({ code: "", name: "", description: "", sort_order: 0 });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to create plan", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
          <DialogDescription>Add a new subscription plan. Configure its limits and pricing after creation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Plan Code <span className="text-destructive">*</span></Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. BASIC, ENTERPRISE"
            />
            <p className="text-[11px] text-muted-foreground">Unique uppercase code. &quot;FREE&quot; is reserved for the default plan.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Display Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Basic, Enterprise"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Create Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddLimitDialog({ open, onOpenChange, planId, existingKeys, onAdded }) {
  const { toast } = useToast();
  const [key, setKey] = useState(LIMIT_KEYS[0].key);
  const [value, setValue] = useState("0");
  const [saving, setSaving] = useState(false);

  const available = LIMIT_KEYS.filter((k) => !existingKeys.includes(k.key));
  const selected = LIMIT_KEYS.find((k) => k.key === key);
  const isBool = selected?.type === "boolean";

  useEffect(() => {
    if (open && available.length > 0 && !available.find((k) => k.key === key)) {
      setKey(available[0].key);
      setValue(available[0].type === "boolean" ? "false" : "0");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSaving(true);
    try {
      const created = await base44.entities.PlanLimit.create({
        plan_id: planId,
        limit_key: key,
        limit_value: isBool ? (value === "true" ? "true" : "false") : String(value),
        enabled: true
      });
      toast({ title: "Limit added" });
      onAdded?.(created);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to add limit", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Limit</DialogTitle>
          <DialogDescription>Configure a resource or feature limit for this plan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Limit</Label>
            <Select value={key} onChange={(e) => {
              const newKey = e.target.value;
              const newDef = LIMIT_KEYS.find((k) => k.key === newKey);
              setKey(newKey);
              setValue(newDef?.type === "boolean" ? "false" : "0");
            }}>
              {available.map((k) => (
                <option key={k.key} value={k.key}>{k.label}</option>
              ))}
            </Select>
            {available.length === 0 && <p className="text-[11px] text-muted-foreground">All limits already configured.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Value</Label>
            {isBool ? (
              <Select value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
            ) : (
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Use 999999 for unlimited" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || available.length === 0}>Add Limit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddPricingDialog({ open, onOpenChange, planId, existingCycles, onAdded }) {
  const { toast } = useToast();
  const [cycle, setCycle] = useState("MONTHLY");
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const availableCycles = Object.keys(BILLING_LABELS).filter((c) => !existingCycles.includes(c));

  useEffect(() => {
    if (open && availableCycles.length > 0 && !availableCycles.includes(cycle)) {
      setCycle(availableCycles[0]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSaving(true);
    try {
      const created = await base44.entities.PlanPricing.create({
        plan_id: planId,
        billing_cycle: cycle,
        price: Number(price) || 0,
        currency: "INR",
        duration_months: BILLING_DURATION[cycle],
        is_active: true,
        sort_order: 0
      });
      toast({ title: "Pricing option added" });
      onAdded?.(created);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to add pricing", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Pricing Option</DialogTitle>
          <DialogDescription>Add a billing cycle price for this plan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Billing Cycle</Label>
            <Select value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {availableCycles.map((c) => (
                <option key={c} value={c}>{BILLING_LABELS[c]}</option>
              ))}
            </Select>
            {availableCycles.length === 0 && <p className="text-[11px] text-muted-foreground">All billing cycles already added.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Price (₹)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || availableCycles.length === 0}>Add Pricing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}