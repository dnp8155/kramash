import { HardDrive, ChevronRight } from "lucide-react";
import { useStorageData } from "@/hooks/useStorageData";
import { copyCount } from "@/lib/storageService";
import { useT } from "@/hooks/useT";
import DriveChip from "@/components/storage/DriveChip";
import { EventStorageSummarySkeleton } from "@/components/storage/StorageSkeletons";

// Compact "where are the files" line for the Progress tab; opens the Storage tab.
export default function EventStorageSummary({ eventId, onOpen }) {
  const t = useT();
  const { drivesById, locations, loading } = useStorageData();
  if (loading) return <EventStorageSummarySkeleton />;
  const mine = locations.filter((l) => l.event_id === eventId);
  const driveIds = [...new Set(mine.map((l) => l.drive_id || l.drive_name_snapshot))];
  const copies = copyCount(mine);

  return (
    <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 bg-card border border-border rounded-[15px] px-4 py-3 text-left hover:bg-muted/40 transition-colors">
      <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{t("Storage")}</div>
        {mine.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("Not added yet — note where the files are saved.")}</div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {driveIds.map((id) => {
              const l = mine.find((x) => (x.drive_id || x.drive_name_snapshot) === id);
              return <DriveChip key={id} drive={drivesById[l.drive_id]} name={l.drive_name_snapshot} />;
            })}
            <span className="text-xs text-muted-foreground">· {copies} {copies === 1 ? t("copy") : t("copies")}</span>
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
