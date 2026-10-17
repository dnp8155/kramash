import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Plus, X } from "lucide-react";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";
import { useT } from "@/hooks/useT";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { COPY_ROLES, parseSubfolders, storageExamples } from "@/lib/storageService";
import DriveForm from "@/components/storage/DriveForm";

const NEW_DRIVE = "__new__";
const empty = { drive_id: "", copy_role: "original", folder_path: "", note: "" };

// Add / edit one place an event's files are saved: drive, folder path, subfolders, what the copy is.
export default function LocationForm({ open, onClose, location = null, event, drives = [], workspaceId }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const term = useBusinessTerminology();
  const examples = storageExamples(workspace);
  const [form, setForm] = useState(empty);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState("");
  const [showDrive, setShowDrive] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const activeDrives = drives.filter((d) => d.status !== "inactive" || d.id === location?.drive_id);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(location ? { ...empty, ...location, drive_id: location.drive_id || "", folder_path: location.folder_path || "", note: location.note || "" } : { ...empty, drive_id: activeDrives[0]?.id || "" });
    setSubs(parseSubfolders(location?.subfolders));
  }, [open, location]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSub = (i, k, v) => setSubs((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const submit = async (e) => {
    e.preventDefault();
    const drive = drives.find((d) => d.id === form.drive_id);
    if (!drive) { setError(t("Pick a drive (or add one).")); return; }
    if (!assertOnline() || !start()) return;
    try {
      const payload = {
        workspace_id: workspaceId,
        event_id: event.id,
        drive_id: drive.id,
        drive_name_snapshot: drive.name,
        copy_role: form.copy_role,
        folder_path: form.folder_path.trim(),
        subfolders: subs.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), note: (s.note || "").trim() })),
        note: form.note.trim(),
      };
      if (location?.id) await base44.entities.StorageLocation.update(location.id, payload);
      else await base44.entities.StorageLocation.create(payload);
      invalidateEntities(queryClient, ["StorageLocation"]);
      toast({ title: location ? t("Storage updated") : t("Storage added") });
      onClose?.();
    } catch (err) {
      setError(err?.message || t("Couldn't save."));
    } finally {
      stop();
    }
  };

  return (
    <>
      <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
        <AppDialogContent maxWidth="max-w-lg">
          <AppDialogHeader>
            <AppDialogTitle>{location ? t("Edit storage") : t("Add storage")}</AppDialogTitle>
            <AppDialogDescription>{event?.title}</AppDialogDescription>
          </AppDialogHeader>
          <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
            <AppDialogBody className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Drive")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.drive_id}
                    onChange={(e) => (e.target.value === NEW_DRIVE ? setShowDrive(true) : set("drive_id", e.target.value))}
                    className="w-full"
                  >
                    <option value="">{t("Select a drive")}</option>
                    {activeDrives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value={NEW_DRIVE}>＋ {t("Add new drive")}</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("This copy is")}</Label>
                  <Select value={form.copy_role} onChange={(e) => set("copy_role", e.target.value)} className="w-full">
                    {COPY_ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("Folder")}</Label>
                <Input value={form.folder_path} onChange={(e) => set("folder_path", e.target.value)} placeholder={`${t("e.g.")} ${new Date().getFullYear()} / ${t("Client name")} / ${term.workItemSingular}`} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("Subfolders")}</Label>
                {subs.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={s.name} onChange={(e) => setSub(i, "name", e.target.value)} placeholder={`${t("Folder name, e.g.")} ${examples.subfolders[0]}`} className="flex-1" />
                    <Input value={s.note} onChange={(e) => setSub(i, "note", e.target.value)} placeholder={t("Note (optional)")} className="flex-1" />
                    <button type="button" onClick={() => setSubs((x) => x.filter((_, j) => j !== i))} aria-label={t("Remove")} className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setSubs((x) => [...x, { name: "", note: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mr-1">
                    <Plus className="w-3.5 h-3.5" />{t("Add subfolder")}
                  </button>
                  {examples.subfolders.filter((n) => !subs.some((s) => s.name.trim().toLowerCase() === n.toLowerCase())).map((n) => (
                    <button key={n} type="button" onClick={() => setSubs((x) => [...x.filter((s) => s.name.trim() || s.note.trim()), { name: n, note: "" }])} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                      + {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("Note")}</Label>
                <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={t("Anything to remember about this copy")} />
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
      <DriveForm
        open={showDrive}
        onClose={() => setShowDrive(false)}
        onSaved={(d) => d?.id && set("drive_id", d.id)}
        workspaceId={workspaceId}
      />
    </>
  );
}
