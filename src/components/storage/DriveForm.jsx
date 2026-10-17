import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ExpenseCategoryAutocomplete from "@/components/financial/ExpenseCategoryAutocomplete";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";
import { useT } from "@/hooks/useT";
import { DRIVE_KINDS, DRIVE_COLORS, kindLabel, kindFromText } from "@/lib/storageService";

const empty = { name: "", kind: "Hard drive", color: DRIVE_COLORS[0], note: "" };

export default function DriveForm({ open, onClose, onSaved, drive = null, workspaceId }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const { saving, start, stop } = useSubmitGuard();

  useEffect(() => {
    if (open) { setError(""); setForm(drive ? { ...empty, ...drive, kind: kindLabel(drive.kind), note: drive.note || "" } : empty); }
  }, [open, drive]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t("Drive name is required.")); return; }
    if (!assertOnline() || !start()) return;
    try {
      const payload = { workspace_id: workspaceId, name: form.name.trim(), kind: kindFromText(form.kind), color: form.color, note: form.note.trim() };
      const saved = drive?.id
        ? await base44.entities.StorageDrive.update(drive.id, payload)
        : await base44.entities.StorageDrive.create(payload);
      // Locations keep a copy of the drive's name; keep it current when the drive is renamed.
      if (drive?.id && drive.name !== payload.name) {
        const locs = await base44.entities.StorageLocation.filter({ workspace_id: workspaceId, drive_id: drive.id }, "-created_date", 1000);
        await Promise.all((locs || []).map((l) => base44.entities.StorageLocation.update(l.id, { drive_name_snapshot: payload.name })));
      }
      invalidateEntities(queryClient, ["StorageDrive"]);
      toast({ title: drive ? t("Drive updated") : t("Drive added") });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || t("Couldn't save the drive."));
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{drive ? t("Edit drive") : t("Add drive")}</AppDialogTitle>
          <AppDialogDescription>{t("Add each drive, card or cloud space once, then pick it for every job saved there.")}</AppDialogDescription>
        </AppDialogHeader>
        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("Drive name")} <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("e.g. Drive A, Seagate 4TB")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Type")}</Label>
              <ExpenseCategoryAutocomplete
                value={form.kind}
                onChange={(v) => set("kind", v)}
                suggestions={DRIVE_KINDS.map((k) => t(k.label))}
                placeholder={t("Pick a type or type your own (e.g. Hard drive, LTO tape)")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Colour")}</Label>
              <div className="flex flex-wrap items-center gap-2">
                {DRIVE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    aria-label={c}
                    className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center", form.color === c ? "border-foreground" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  >
                    {form.color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="w-8 h-8 rounded-full border border-border bg-transparent p-0 cursor-pointer" />
                  {t("Custom")}
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Note")}</Label>
              <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={t("e.g. In the office shelf, 4 TB")} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? t("Saving…") : t("Save")}</Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}
