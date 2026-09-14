import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { parseMiscExpenses } from "@/components/events/EventMiscExpenseEditor";

// Add / edit a payment-tab add-on (name + amount only).
// Stored on the event's misc_expenses_json so existing data stays compatible.
export default function AddOnDialog({ open, onClose, onSaved, event, currency = "INR", editingItem = null }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editingItem?.name || "");
      setAmount(editingItem?.amount != null ? String(editingItem.amount) : "");
    }
  }, [open, editingItem]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      toast({ title: "Name and amount are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const items = parseMiscExpenses(event?.misc_expenses_json);
      const parsedAmount = Number(amount) || 0;
      let updated;
      if (editingItem) {
        updated = items.map((it) =>
          it.id === editingItem.id ? { ...it, name: name.trim(), amount: parsedAmount } : it
        );
      } else {
        updated = [...items, { id: `ao${Date.now()}`, name: name.trim(), amount: parsedAmount }];
      }
      await base44.entities.Event.update(event.id, { misc_expenses_json: JSON.stringify(updated) });
      toast({ title: editingItem ? "Add-on updated" : "Add-on added" });
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: err?.message || "Failed to save add-on", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-base font-bold">{editingItem ? "Edit Add-on" : "Add Add-on"}</DialogTitle>
          <DialogDescription className="text-xs">Adds to the contract value for this event.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel, Extra Album" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter className="px-5 py-4 border-t border-border flex-row-reverse gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}