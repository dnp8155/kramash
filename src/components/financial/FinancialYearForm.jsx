import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";

export default function FinancialYearForm({
  open,
  onClose,
  onSaved,
  workspaceId,
  editing,
}) {
  const { toast } = useToast();
  const t = useT();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStartDate(editing?.start_date || "");
      setEndDate(editing?.end_date || "");
    }
  }, [open, editing]);

  const fyId = useMemo(() => {
    if (!startDate || !endDate) return "";
    const sy = new Date(startDate).getFullYear();
    const ey = new Date(endDate).getFullYear();
    return `FY${sy}-${String(ey).slice(-2)}`;
  }, [startDate, endDate]);

  const label = useMemo(() => {
    if (!startDate || !endDate) return "";
    const sy = new Date(startDate).getFullYear();
    const ey = new Date(endDate).getFullYear();
    return `April ${sy} - March ${ey}`;
  }, [startDate, endDate]);

  const canSave = startDate && endDate && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.FinancialYear.update(editing.id, {
          start_date: startDate,
          end_date: endDate,
          fy_id: fyId,
          label,
        });
        toast({ title: t("Financial year updated") });
      } else {
        await base44.entities.FinancialYear.create({
          workspace_id: workspaceId,
          start_date: startDate,
          end_date: endDate,
          fy_id: fyId,
          label,
          is_active: false,
        });
        toast({ title: t("Financial year added") });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast({
        title: t("Failed to save"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("Edit Financial Year") : t("Add Financial Year")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("Start Date")}
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("End Date")}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {fyId && (
            <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-medium">{fyId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Label")}</span>
                <span className="font-medium">{label}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}