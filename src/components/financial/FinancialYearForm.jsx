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
import { todayISO, parseISODate } from "@/lib/dates";
import { currentFinancialYearLabel, financialYearRange } from "@/constants/financeConfig";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
      if (editing) {
        setStartDate(editing.start_date || todayISO());
        setEndDate(editing.end_date || todayISO());
      } else {
        // Default to the current financial year per the workspace's
        // configured FY start month (Region Settings), not just "today".
        const range = financialYearRange(currentFinancialYearLabel());
        setStartDate(range?.start || todayISO());
        setEndDate(range?.end || todayISO());
      }
    }
  }, [open, editing]);

  const fyId = useMemo(() => {
    if (!startDate || !endDate) return "";
    const sy = parseISODate(startDate)?.getFullYear();
    const ey = parseISODate(endDate)?.getFullYear();
    if (!sy || !ey) return "";
    return `FY${sy}-${String(ey).slice(-2)}`;
  }, [startDate, endDate]);

  // Reflects the actual month picked for start/end, so it matches whatever
  // FY start month the user selects here (or defaults to via Region Settings).
  const label = useMemo(() => {
    if (!startDate || !endDate) return "";
    const s = parseISODate(startDate);
    const e = parseISODate(endDate);
    if (!s || !e) return "";
    return `${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()} - ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
  }, [startDate, endDate]);

  const canSave = startDate && endDate && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    if (!start()) return;
    try {
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