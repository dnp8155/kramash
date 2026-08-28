import { base44 } from "@/api/base44Client";

// Check whether a file of the given size can be uploaded under the plan's storage limit.
// Call BEFORE uploading. Returns { allowed, current_bytes, limit_bytes }.
export async function checkStorageLimit(workspaceId, fileSizeBytes) {
  const res = await base44.functions.invoke("trackStorageUsage", {
    workspace_id: workspaceId,
    action: "check",
    file_size_bytes: fileSizeBytes
  });
  return res.data;
}

// Record a successful upload (increments usage). Call AFTER the file is uploaded.
// Returns { allowed, total_bytes, file_count, limit_bytes }.
export async function recordFileUpload(workspaceId, fileSizeBytes) {
  const res = await base44.functions.invoke("trackStorageUsage", {
    workspace_id: workspaceId,
    action: "add",
    file_size_bytes: fileSizeBytes
  });
  return res.data;
}

// Record a file deletion (decrements usage).
export async function recordFileRemoval(workspaceId, fileSizeBytes) {
  const res = await base44.functions.invoke("trackStorageUsage", {
    workspace_id: workspaceId,
    action: "remove",
    file_size_bytes: fileSizeBytes
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storage-updated"));
  }
  return res.data;
}

// Get current storage usage + plan limit.
// Returns { total_bytes, file_count, limit_bytes, storage_gb, plan_code }.
export async function getStorageUsage(workspaceId) {
  const res = await base44.functions.invoke("trackStorageUsage", {
    workspace_id: workspaceId,
    action: "get"
  });
  return res.data;
}

// Upload a file with storage-limit enforcement.
// Checks the limit first; if allowed, uploads via UploadFile and records usage.
// Returns { file_url } on success, or { error } if the limit is exceeded.
export async function uploadFileWithLimit(workspaceId, file) {
  const sizeBytes = file.size || 0;

  const check = await checkStorageLimit(workspaceId, sizeBytes);
  if (!check.allowed) {
    return {
      error: "Storage limit exceeded",
      current_bytes: check.current_bytes,
      limit_bytes: check.limit_bytes
    };
  }

  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // Record usage — if this fails (network blip etc.) the file is already uploaded,
  // so we still return the URL. The counter may drift slightly but the user keeps
  // their file and doesn't see a false "upload failed" error.
  try {
    await recordFileUpload(workspaceId, sizeBytes);
    window.dispatchEvent(new CustomEvent("storage-updated"));
  } catch (e) {
    // best-effort tracking; file upload itself succeeded
  }

  return { file_url };
}