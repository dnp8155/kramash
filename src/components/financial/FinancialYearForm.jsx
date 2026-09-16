import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogBody,
  AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { validateFYRange } from "@/lib/financialYearService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

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
  const { saving, start, stop } = useSubmitGuard();

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
    if (!start()) return;
    try {
      // Validate: start < end, no overlap with existing FYs
      const validation = await validateFYRange(workspaceId, startDate, endDate, editing?.id);
      if (!validation.valid) {
        toast({ title: t("Cannot save"), description: t(validation.error), variant: "destructive" });
        stop();
        return;
      }
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
          status: "open",
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
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>
            {editing ? t("Edit Financial Year") : t("Add Financial Year")}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
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
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}