-- ============================================================
-- 0053 — Storage: drive size and folder size
--
-- • storage_drives.capacity_gb: total size of the drive, in GB (empty = not told).
-- • storage_locations.size_gb: how big that folder is, in GB (empty = not told).
-- Used space of a drive = the sum of its folders' sizes; available = capacity − used (worked out in the app).
-- Safe to re-run.
-- ============================================================

ALTER TABLE storage_drives ADD COLUMN IF NOT EXISTS capacity_gb NUMERIC CHECK (capacity_gb IS NULL OR capacity_gb >= 0);
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS size_gb NUMERIC CHECK (size_gb IS NULL OR size_gb >= 0);
