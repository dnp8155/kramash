import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import EmptyState from "@/components/common/EmptyState";
import { FILE_TYPES, fileTypeLabel, formatFileSize, uploadProjectFile, deleteProjectFile } from "@/lib/projectFileService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Upload, Download, Trash2, FileText, FileSignature, ClipboardList, Image, Video, PackageCheck, File, Loader2, Lock } from "lucide-react";

const ICON_MAP = {
  contract: FileSignature,
  brief: ClipboardList,
  reference: Image,
  deliverable: PackageCheck,
  document: FileText,
  image: Image,
  video: Video,
  other: File
};

const TYPE_COLOR = {
  contract: "bg-blue-50 text-blue-600",
  brief: "bg-indigo-50 text-indigo-600",
  reference: "bg-violet-50 text-violet-600",
  deliverable: "bg-green-50 text-green-600",
  document: "bg-muted text-muted-foreground",
  image: "bg-amber-50 text-amber-600",
  video: "bg-rose-50 text-rose-600",
  other: "bg-muted text-muted-foreground"
};

export default function ProjectFilesPanel({ eventId, workspaceId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("document");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["project-files", eventId],
    queryFn: () => base44.entities.ProjectFile.filter({ event_id: eventId }, "-created_date"),
    enabled: !!eventId
  });

  const refresh = () => invalidateEntities(queryClient, ["ProjectFile"]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadProjectFile(file, workspaceId, eventId, selectedType, description, user?.full_name);
      toast({ title: "File uploaded" });
      setDescription("");
      refresh();
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProjectFile(deleteTarget.id);
      toast({ title: "File deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const grouped = FILE_TYPES.map((ft) => ({
    ...ft,
    files: files.filter((f) => f.file_type === ft.key)
  })).filter((g) => g.files.length > 0);

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">File Type</div>
            <select
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {FILE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Description (optional)</div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Signed contract, client brief..."
              className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm"
            />
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              id="project-file-upload"
            />
            <label
              htmlFor="project-file-upload"
              className={cn(
                "flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                uploading ? "bg-muted cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary-hover"
              )}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Upload File"}
            </label>
          </div>
        </div>
      </div>

      {/* Files grouped by type */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading files...</div>
      ) : files.length === 0 ? (
        <EmptyState title="No files uploaded" description="Upload contracts, briefs, references, or deliverables for this project." />
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const Icon = ICON_MAP[group.key] || File;
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", TYPE_COLOR[group.key])} />
                  <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
                  <span className="text-xs text-muted-foreground">({group.files.length})</span>
                </div>
                <div className="space-y-1.5">
                  {group.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", TYPE_COLOR[group.key])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{file.file_name}</span>
                          {file.is_private && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.file_size)}</span>
                          {file.description && <span className="truncate">· {file.description}</span>}
                          {file.uploaded_by_name && <span>· by {file.uploaded_by_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Delete File?</h3>
            <p className="text-sm text-muted-foreground mb-4">This will permanently delete "{deleteTarget.file_name}".</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}