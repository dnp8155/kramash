import { useState, useEffect } from "react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import DialogContextCard from "@/components/common/DialogContextCard";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { parseMiscExpenses } from "@/components/events/EventMiscExpenseEditor";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

export default function AddOnDialog({ open, onClose, onSaved, event, currency = "INR", editingItem = null }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const { saving, start, stop } = useSubmitGuard();

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
    if (!start()) return;
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
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{editingItem ? "Edit Add-on" : "Add Add-on"}</AppDialogTitle>
          <AppDialogDescription>Adds to the contract value for this event.</AppDialogDescription>
        </AppDialogHeader>
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <DialogContextCard event={event} />
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel, Extra Album" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}