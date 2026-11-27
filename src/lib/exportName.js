// The business name used in export filenames, kept in sync by WorkspaceContext. Its own tiny module so the app's
// startup (and every client/team portal) doesn't download the whole export code just to remember a name.
let exportBusinessName = "";

export function setExportBusinessName(name) {
  exportBusinessName = String(name || "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
}

export function getExportBusinessName() {
  return exportBusinessName;
}
