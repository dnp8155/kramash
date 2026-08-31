import { base44 } from "@/api/base44Client";

export const FILE_TYPES = [
  { key: "contract", label: "Contract", icon: "FileSignature", color: "text-blue-600" },
  { key: "brief", label: "Brief", icon: "ClipboardList", color: "text-indigo-600" },
  { key: "reference", label: "Reference", icon: "Image", color: "text-violet-600" },
  { key: "deliverable", label: "Deliverable", icon: "PackageCheck", color: "text-green-600" },
  { key: "document", label: "Document", icon: "FileText", color: "text-muted-foreground" },
  { key: "image", label: "Image", icon: "Image", color: "text-amber-600" },
  { key: "video", label: "Video", icon: "Video", color: "text-rose-600" },
  { key: "other", label: "Other", icon: "File", color: "text-muted-foreground" }
];

export const fileTypeLabel = (type) => FILE_TYPES.find((t) => t.key === type)?.label || type || "Document";

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

export function detectFileType(fileName, mimeType) {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (["pdf", "doc", "docx"].includes(ext)) return "document";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  return "other";
}

export async function uploadProjectFile(file, workspaceId, eventId, fileType, description, uploadedByName, isPrivate) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return base44.entities.ProjectFile.create({
    workspace_id: workspaceId,
    event_id: eventId,
    file_name: file.name,
    file_url,
    file_type: fileType || detectFileType(file.name, file.type),
    file_size: file.size || 0,
    mime_type: file.type || "",
    description: description || "",
    uploaded_by_name: uploadedByName || "",
    is_private: isPrivate || false
  });
}

export async function deleteProjectFile(id) {
  return base44.entities.ProjectFile.delete(id);
}