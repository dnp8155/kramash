import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HardDrive, Plus, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useStorageData } from "@/hooks/useStorageData";
import { useToast } from "@/components/ui/use-toast";
import { askConfirm } from "@/lib/confirmDialog";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { copyCount } from "@/lib/storageService";
import { useT } from "@/hooks/useT";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import LocationCard from "@/components/storage/LocationCard";
import LocationForm from "@/components/storage/LocationForm";
import { EventStorageTabSkeleton } from "@/components/storage/StorageSkeletons";

// Event details → Storage: where this job's files are saved (drive, folder, subfolders, copies).
export default function EventStorageTab({ event, workspaceId, term }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { drives, drivesById, locations, loading } = useStorageData();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const mine = locations.filter((l) => l.event_id === event.id);
  const copies = copyCount(mine);

  const remove = async (l) => {
    if (!await askConfirm(t("Remove this storage entry? Your files on the drive are not touched."))) return;
    try {
      await base44.entities.StorageLocation.delete(l.id);
      invalidateEntities(queryClient, ["StorageLocation"]);
      toast({ title: t("Storage removed") });
    } catch (e) {
      toast({ title: t("Failed to remove"), description: e?.message, variant: "destructive" });
    }
  };

  const add = () => { setEditing(null); setOpen(true); };

  if (loading && mine.length === 0) return <EventStorageTabSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{t("Storage")}</span>
          {mine.length > 0 && <span className="text-xs text-muted-foreground">({copies} {copies === 1 ? t("copy") : t("copies")})</span>}
        </div>
        <Button size="sm" onClick={add}><Plus className="w-3.5 h-3.5" /> {t("Add storage")}</Button>
      </div>

      {mine.length > 0 && copies === 1 && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-foreground">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          {t("Only one copy of these files. Add a backup on another drive.")}
        </div>
      )}

      {mine.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={t("No storage added yet")}
            description={`${t("Note which drive and folder this")} ${term?.workItemSingular?.toLowerCase() || "event"}${t("'s files are saved in, so you can find them later.")}`}
            action={<Button size="sm" onClick={add}><Plus className="w-3.5 h-3.5" /> {t("Add storage")}</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mine.map((l) => (
            <LocationCard key={l.id} location={l} drive={drivesById[l.drive_id]} onEdit={(x) => { setEditing(x); setOpen(true); }} onDelete={remove} />
          ))}
        </div>
      )}

      <LocationForm open={open} onClose={() => setOpen(false)} location={editing} event={event} drives={drives} workspaceId={workspaceId} />
    </div>
  );
}
