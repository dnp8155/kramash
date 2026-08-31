import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { INVOICE_STATUS, parseJson, calcInvoiceTotals, createInvoice, updateInvoice } from "@/lib/invoiceService";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CLASS = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground"
};

export default function InvoiceEditor({ open, onClose, onSaved, invoice, workspaceId, clients = [], events = [], gstRate = 18 }) {
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setForm({
        invoice_number: invoice.invoice_number || "",
        client_id: invoice.client_id || "",
        event_id: invoice.event_id || "",
        invoice_date: invoice.invoice_date || new Date().toISOString().split("T")[0],
        due_date: invoice.due_date || "",
        status: invoice.status || "draft",
        discount_amount: invoice.discount_amount || 0,
        gst_applicable: invoice.gst_applicable || false,
        notes: invoice.notes || "",
        terms_and_conditions: invoice.terms_and_conditions || ""
      });
      setItems(parseJson(invoice.items_json));
    }
  }, [open, invoice]);

  if (!open || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => {
    setItems((prev) => [...prev, { name: "", description: "", quantity: 1, days: 1, unit_rate: 0, rate_type: "Fixed" }]);
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const calc = calcInvoiceTotals(items, form.discount_amount, form.gst_applicable, gstRate);
  const balanceDue = Math.max(0, calc.grand_total - (Number(invoice?.amount_paid) || 0));

  const handleSubmit = async () => {
    if (!form.invoice_number?.trim()) {
      toast({ title: "Invoice number is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        invoice_number: form.invoice_number.trim(),
        client_id: form.client_id || "",
        event_id: form.event_id || "",
        invoice_date: form.invoice_date || "",
        due_date: form.due_date || "",
        status: form.status || "draft",
        items_json: JSON.stringify(items),
        subtotal: calc.subtotal,
        discount_amount: calc.discount_amount,
        gst_applicable: form.gst_applicable || false,
        gst_amount: calc.gst_amount,
        grand_total: calc.grand_total,
        amount_paid: Number(invoice?.amount_paid) || 0,
        balance_due: balanceDue,
        notes: form.notes || "",
        terms_and_conditions: form.terms_and_conditions || ""
      };
      if (invoice?.id) {
        await updateInvoice(invoice.id, payload);
        toast({ title: "Invoice updated" });
      } else {
        await createInvoice(payload);
        toast({ title: "Invoice created" });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: "Failed to save invoice", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = form.client_id ? events.filter((e) => e.client_id === form.client_id) : events;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice?.id ? "Edit Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number *</Label>
              <Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {INVOICE_STATUS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Project / Event</Label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={form.event_id}
                onChange={(e) => set("event_id", e.target.value)}
              >
                <option value="">Select project</option>
                {filteredEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={form.invoice_date} onChange={(e) => set("invoice_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No items. Click "Add Item" to add line items.
              </p>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    placeholder="Item name"
                    className="flex-1 h-8 text-sm"
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Qty</div>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Days</div>
                    <Input type="number" value={item.days} onChange={(e) => updateItem(idx, "days", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Rate</div>
                    <Input type="number" value={item.unit_rate} onChange={(e) => updateItem(idx, "unit_rate", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Total</div>
                    <div className="h-8 flex items-center text-sm font-semibold tabular-nums">
                      ₹{((Number(item.quantity) || 0) * (Number(item.unit_rate) || 0) * (Number(item.days) || 0)).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="space-y-1.5">
              <Label>Discount Amount</Label>
              <Input type="number" value={form.discount_amount} onChange={(e) => set("discount_amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>GST Applicable</Label>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  checked={form.gst_applicable}
                  onChange={(e) => set("gst_applicable", e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-muted-foreground">GST @ {gstRate}%</span>
              </div>
            </div>
            <div className="col-span-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold tabular-nums">₹{calc.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-semibold text-destructive tabular-nums">- ₹{calc.discount_amount.toLocaleString("en-IN")}</span></div>
              {form.gst_applicable && (
                <div className="flex justify-between"><span className="text-muted-foreground">GST ({gstRate}%)</span><span className="font-semibold tabular-nums">₹{calc.gst_amount.toLocaleString("en-IN")}</span></div>
              )}
              <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold">Grand Total</span><span className="font-bold text-lg tabular-nums">₹{calc.grand_total.toLocaleString("en-IN")}</span></div>
              {Number(invoice?.amount_paid) > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-semibold text-success tabular-nums">₹{Number(invoice.amount_paid).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Balance Due</span><span className="font-bold text-warning tabular-nums">₹{balanceDue.toLocaleString("en-IN")}</span></div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Terms & Conditions</Label>
            <Textarea value={form.terms_and_conditions} onChange={(e) => set("terms_and_conditions", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : invoice?.id ? "Update Invoice" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}