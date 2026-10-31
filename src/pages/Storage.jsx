import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { askConfirm } from "@/lib/confirmDialog";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import { useStorageData } from "@/hooks/useStorageData";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePageCreateAction } from "@/lib/pageCreateAction";
import { useT } from "@/hooks/useT";
import { copyCount, locationSearchText, searchLocations, kindLabel, driveUsage, driveBreakdown, ROLE_COLORS, roleLabel, formatSize } from "@/lib/storageService";
import StorageOverview, { SegmentBar } from "@/components/storage/StorageOverview";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import StoragePageSkeleton from "@/components/storage/StorageSkeletons";
import DriveChip from "@/components/storage/DriveChip";
import DriveForm from "@/components/storage/DriveForm";
import LocationCard from "@/components/storage/LocationCard";
import LocationForm from "@/components/storage/LocationForm";
import Select from "@/components/common/Select";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { formatEventDates } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Used / available space of one drive: a bar when its total size is known, otherwise just what is used.
function DriveSpace({ drive, locations, t }) {
  const usage = driveUsage(drive, locations);
  const { used, unsized, capacity, available } = usage;
  if (capacity == null && used === 0) return null;
  const over = available != null && available < 0;
  const parts = driveBreakdown(drive, locations);
  const whole = capacity || used || 1;
  const segments = parts.map((p) => ({ key: p.role, color: ROLE_COLORS[p.role] || "#64748B", label: `${t(roleLabel(p.role))} · ${formatSize(p.gb)}`, pct: (p.gb / whole) * 100 }));
  return (
    <div className="space-y-1.5">
      {(capacity != null || parts.length > 0) && <SegmentBar segments={segments} className="h-2" />}
      <div className="text-xs text-muted-foreground">
        {capacity != null
          ? <>{formatSize(used)} {t("used")} · <span className={over ? "text-destructive font-medium" : "text-foreground font-medium"}>{over ? `${formatSize(-available)} ${t("over")}` : `${formatSize(available)} ${t("available")}`}</span> · {formatSize(capacity)}</>
          : <>{formatSize(used)} {t("used")}</>}
      </div>
      {parts.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {parts.map((p) => (
            <li key={p.role} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ROLE_COLORS[p.role] || "#64748B" }} />{t(roleLabel(p.role))} {formatSize(p.gb)}
            </li>
          ))}
        </ul>
      )}
      {unsized > 0 && <div className="text-[11px] text-muted-foreground">{unsized} {unsized === 1 ? t("folder has no size added") : t("folders have no size added")}</div>}
    </div>
  );
}

// Every drive and what is saved on it, searchable by drive, folder, subfolder, note, event or client.
export default function Storage() {
  const t = useT();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const { workspaceId, workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showStorageTab } = useDisplayPreferences();
  usePageTitle("Storage");
  const { drives, drivesById, locations, loading } = useStorageData();
  const [query, setQuery] = useState("");
  const [driveFilter, setDriveFilter] = useState("all");
  const [showDrive, setShowDrive] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [needsBackup, setNeedsBackup] = useState(false);
  const [pickOpen, setPickOpen] = useState(false); // choose which job to add storage for
  const [pickId, setPickId] = useState("");
  const [addFor, setAddFor] = useState(null); // event chosen for a new entry
  const [editingLoc, setEditingLoc] = useState(null);

  const { data: lookups } = useQuery({
    queryKey: ["storage-lookups", workspaceId],
    queryFn: async () => {
      const [events, clients] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 1000),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 1000),
      ]);
      return { events: events || [], clients: clients || [] };
    },
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
  const eventsById = useMemo(() => Object.fromEntries((lookups?.events || []).map((e) => [e.id, e])), [lookups]);
  const clientsById = useMemo(() => Object.fromEntries((lookups?.clients || []).map((c) => [c.id, c])), [lookups]);

  const rows = useMemo(() => locations.map((l) => {
    const event = eventsById[l.event_id];
    const drive = drivesById[l.drive_id];
    return { ...l, _event: event, _drive: drive, _searchText: locationSearchText(l, { drive, event, client: clientsById[event?.client_id] }) };
  }), [locations, eventsById, drivesById, clientsById]);

  const visible = useMemo(() => {
    let list = driveFilter === "all" ? rows : rows.filter((r) => (r.drive_id || "none") === driveFilter);
    list = searchLocations(list, query);
    if (needsBackup) {
      const perEvent = {};
      for (const r of rows) (perEvent[r.event_id] ||= []).push(r);
      list = list.filter((r) => copyCount(perEvent[r.event_id]) === 1);
    }
    return list;
  }, [rows, driveFilter, query, needsBackup]);

  // Group by event so each job shows its copies together.
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of visible) {
      if (!map.has(r.event_id)) map.set(r.event_id, { event: r._event, items: [] });
      map.get(r.event_id).items.push(r);
    }
    return [...map.values()];
  }, [visible]);

  const countOn = (id) => rows.filter((r) => r.drive_id === id).length;
  const eventsOn = (id) => new Set(rows.filter((r) => r.drive_id === id).map((r) => r.event_id)).size;
  const singleCopyEvents = useMemo(() => {
    const per = {};
    for (const r of rows) (per[r.event_id] ||= []).push(r);
    return Object.values(per).filter((l) => copyCount(l) === 1).length;
  }, [rows]);
  const eventOptions = lookups?.events || [];
  // Saved with the workspace's other display options (read everywhere through useDisplayPreferences).
  const setShowStorageTab = async (value) => {
    let saved = {};
    try { const raw = workspace?.display_preferences; saved = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw); } catch { /* start fresh */ }
    const next = JSON.stringify({ ...saved, showStorageTab: value });
    const previous = workspace?.display_preferences;
    setWorkspace((w) => ({ ...w, display_preferences: next }));
    try {
      await base44.entities.Workspace.update(workspace.id, { display_preferences: next });
    } catch (e) {
      setWorkspace((w) => ({ ...w, display_preferences: previous }));
      toast({ title: t("Failed to save preference"), description: e?.message, variant: "destructive" });
    }
  };
  const removeDrive = async (d) => {
    const n = rows.filter((r) => r.drive_id === d.id).length;
    const msg = n > 0
      ? `${t("Delete")} "${d.name}"? ${n} ${t("saved entries keep its name but are no longer linked to a drive.")}`
      : `${t("Delete")} "${d.name}"?`;
    if (!await askConfirm(msg)) return;
    try {
      await base44.entities.StorageDrive.delete(d.id);
      invalidateEntities(queryClient, ["StorageDrive"]);
      if (driveFilter === d.id) setDriveFilter("all");
      toast({ title: t("Drive deleted") });
    } catch (e) {
      toast({ title: t("Failed to delete drive"), description: e?.message, variant: "destructive" });
    }
  };
  const openAdd = () => {
    if (eventOptions.length === 0) {
      toast({ title: `${t("Add a")} ${term.workItemSingular.toLowerCase()} ${t("first, then note where its files are saved.")}` });
      return;
    }
    setPickId("");
    setPickOpen(true);
  };
  // On phones the round button in the bottom bar becomes "Add storage" on this page.
  usePageCreateAction(openAdd);

  if (loading) return <StoragePageSkeleton />;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title={t("Storage")} subtitle={`${t("Find which drive and folder each")} ${term.workItemSingular.toLowerCase()} ${t("is saved in.")}`}>
        <Button size="sm" variant="outline" onClick={() => { setEditingDrive(null); setShowDrive(true); }}><Plus className="w-3.5 h-3.5" />{t("Add drive")}</Button>
        <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />{t("Add storage")}</Button>
      </PageHeader>

      <div className="bg-card border border-border rounded-[15px] p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground block">{t("Show Storage tab")}</span>
          <span className="text-xs text-muted-foreground">
            {`${t("Adds a Storage tab after Notes on every")} ${term.workItemSingular.toLowerCase()} ${t("details page, and a Storage line in its Activity tab.")}`}
          </span>
        </div>
        <Toggle checked={showStorageTab} onChange={setShowStorageTab} label={t("Show Storage tab")} />
      </div>

      <StorageOverview drives={drives} locations={locations} eventsById={eventsById} term={term} />

      {drives.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Drives")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {drives.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-[15px] p-3.5 flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <DriveChip drive={d} />
                  <div className="text-xs text-muted-foreground">
                    {kindLabel(d.kind)} · {eventsOn(d.id)} {eventsOn(d.id) === 1 ? term.workItemSingular.toLowerCase() : term.workItemPlural.toLowerCase()}
                  </div>
                  <DriveSpace drive={d} locations={locations} t={t} />
                  {d.note && <div className="text-xs text-muted-foreground truncate">{d.note}</div>}
                </div>
                <button onClick={() => { setEditingDrive(d); setShowDrive(true); }} aria-label={t("Edit drive")} className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-primary shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeDrive(d)} aria-label={t("Delete drive")} className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {drives.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {singleCopyEvents > 0 && (
            <button onClick={() => setNeedsBackup((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", needsBackup ? "bg-warning text-white border-warning" : "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20")}>
              <AlertTriangle className="w-3.5 h-3.5" />{t("Needs backup")} · {singleCopyEvents}
            </button>
          )}
          <button onClick={() => setDriveFilter("all")} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", driveFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
            {t("All")} · {rows.length}
          </button>
          {drives.map((d) => (
            <button key={d.id} onClick={() => setDriveFilter(driveFilter === d.id ? "all" : d.id)} className={cn("rounded-full transition-opacity", driveFilter !== "all" && driveFilter !== d.id && "opacity-50")} title={kindLabel(d.kind)}>
              <DriveChip drive={d} name={`${d.name} · ${countOn(d.id)}`} className={driveFilter === d.id ? "ring-2 ring-offset-1 ring-foreground/30" : ""} />
            </button>
          ))}
        </div>
      )}

      <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by client, folder, drive, note…")} className="max-w-md" />

      {rows.length === 0 ? (
        <EmptyState
          title={t("Nothing saved yet")}
          description={drives.length === 0 ? t("Add your drives first, then note where each job's files are saved from the job's Storage tab.") : t("Open a job and use its Storage tab to note where its files are saved.")}
          action={drives.length === 0 ? <Button size="sm" onClick={() => setShowDrive(true)}><Plus className="w-3.5 h-3.5" />{t("Add drive")}</Button> : <Button size="sm" onClick={() => navigate("/events")}>{t("Go to")} {term.workItemPlural}</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState title={t("No matches")} description={t("Try another word, or clear the drive filter.")} />
      ) : (
        <div className="space-y-5">
          {groups.map(({ event, items }) => {
            const copies = copyCount(items);
            return (
              <section key={event?.id || items[0].id} className="space-y-2">
                <button onClick={() => event && navigate(`/events/${event.id}`)} className="flex flex-wrap items-baseline gap-x-2 text-left">
                  <span className="text-sm font-semibold text-foreground hover:underline">{event?.title || t("Deleted")}</span>
                  {event?.start_date && <span className="text-xs text-muted-foreground">{formatEventDates(event)}</span>}
                  <span className={cn("text-xs", copies === 1 ? "text-warning" : "text-muted-foreground")}>· {copies} {copies === 1 ? t("copy") : t("copies")}</span>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((l) => <LocationCard key={l.id} location={l} drive={l._drive} onEdit={event ? (x) => { setEditingLoc(x); setAddFor(event); } : undefined} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <DriveForm open={showDrive} onClose={() => setShowDrive(false)} drive={editingDrive} workspaceId={workspaceId} />

      <AppDialog open={pickOpen} onOpenChange={(o) => !o && setPickOpen(false)}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>{t("Add storage")}</AppDialogTitle>
            <AppDialogDescription>{`${t("Which")} ${term.workItemSingular.toLowerCase()} ${t("are these files from?")}`}</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody>
            <Select value={pickId} onChange={(e) => setPickId(e.target.value)} className="w-full">
              <option value="">{`${t("Select")} ${term.workItemSingular.toLowerCase()}`}</option>
              {eventOptions.map((e) => <option key={e.id} value={e.id}>{e.title}{e.start_date ? ` · ${formatEventDates(e)}` : ""}</option>)}
            </Select>
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPickOpen(false)}>{t("Cancel")}</Button>
            <Button type="button" disabled={!pickId} onClick={() => { setEditingLoc(null); setAddFor(eventsById[pickId]); setPickOpen(false); }}>{t("Continue")}</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      <LocationForm open={!!addFor} onClose={() => { setAddFor(null); setEditingLoc(null); }} location={editingLoc} event={addFor} drives={drives} workspaceId={workspaceId} />
    </div>
  );
}
