import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PACKAGE_CATEGORIES, parseItems, stringifyItems, calcPackageTotal, createPackage, updatePackage } from "@/lib/packageService";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY = {
  name: "",
  description: "",
  category: "general",
  discount_type: "percent",
  discount_value: 0
};

export default function PackageForm({ open, onClose, onSaved, pkg, workspaceId, services = [], currency = "INR" }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (pkg) {
        setForm({
          name: pkg.name || "",
          description: pkg.description || "",
          category: pkg.category || "general",
          discount_type: pkg.discount_type || "percent",
          discount_value: pkg.discount_value || 0
        });
        setItems(parseItems(pkg.items_json));
      } else {
        setForm(EMPTY);
        setItems([]);
      }
    }
  }, [open, pkg]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => {
    setItems((prev) => [...prev, { service_id: "", name: "", quantity: 1, days: 1, unit_rate: 0, rate_type: "Fixed" }]);
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const onServiceSelect = (idx, serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setItems((prev) => prev.map((it, i) =>
        i === idx ? { ...it, service_id: serviceId, name: service.name, unit_rate: service.default_rate || 0, rate_type: service.rate_type || "Fixed" } : it
      ));
    } else {
      updateItem(idx, "service_id", serviceId);
    }
  };

  const calc = calcPackageTotal(items, form.discount_type, form.discount_value);

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Package name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name.trim(),
        description: form.description || "",
        category: form.category || "general",
        items_json: stringifyItems(items),
        subtotal: calc.subtotal,
        discount_type: form.discount_type || "percent",
        discount_value: Number(form.discount_value) || 0,
        discount_amount: calc.discount_amount,
        total_price: calc.total_price,
        is_active: pkg?.is_active !== false
      };
      if (pkg?.id) {
        await updatePackage(pkg.id, payload);
        toast({ title: "Package updated" });
      } else {
        await createPackage(payload);
        toast({ title: "Package created" });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: "Failed to save package", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg?.id ? "Edit Package" : "New Package"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Package Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wedding Premium" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {PACKAGE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="What's included in this package..." />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items / Services</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No items added. Click "Add Item" to include services in this package.
              </p>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs col-span-2"
                    value={item.service_id}
                    onChange={(e) => onServiceSelect(idx, e.target.value)}
                  >
                    <option value="">Custom Item</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    placeholder="Item name"
                    className="h-8 text-xs col-span-2"
                  />
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Qty</div>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">Days</div>
                    <Input type="number" value={item.days} onChange={(e) => updateItem(idx, "days", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Unit Rate</div>
                    <Input type="number" value={item.unit_rate} onChange={(e) => updateItem(idx, "unit_rate", e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Discount + Total */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.discount_type}
                onChange={(e) => set("discount_type", e.target.value)}
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount Value</Label>
              <Input type="number" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold tabular-nums">₹{calc.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-semibold text-destructive tabular-nums">- ₹{calc.discount_amount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold">Total</span><span className="font-bold text-lg tabular-nums">₹{calc.total_price.toLocaleString("en-IN")}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : pkg?.id ? "Update Package" : "Create Package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}