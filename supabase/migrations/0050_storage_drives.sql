-- ============================================================
-- 0050 — Storage: where each job's files are saved
--
-- • storage_drives: the drives / cards / cloud spaces a workspace uses (name, colour, kind, note).
-- • storage_locations: one row per place an event's files live — which drive, the folder path, subfolders
--   (JSON list of { name, note }), what the copy is (original / backup / edited / delivered) and a note.
--   An event can have several (that is how "2 copies" is counted).
-- Same privacy rule as leads: only the user who created a row can see or change it.
-- Deleting a drive keeps its locations (drive_id becomes empty, the saved drive name stays).
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS storage_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'hdd',          -- hdd | ssd | card | cloud | nas | other
  color TEXT NOT NULL DEFAULT '#3B82F6',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',     -- active | inactive
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  drive_id UUID REFERENCES storage_drives(id) ON DELETE SET NULL,
  drive_name_snapshot TEXT,
  copy_role TEXT NOT NULL DEFAULT 'original', -- original | backup | edited | delivered
  folder_path TEXT,
  subfolders JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

CREATE INDEX IF NOT EXISTS idx_storage_drives_workspace ON storage_drives (workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_workspace ON storage_locations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_event ON storage_locations (event_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_drive ON storage_locations (drive_id);

DROP TRIGGER IF EXISTS storage_drives_updated_at ON storage_drives;
CREATE TRIGGER storage_drives_updated_at BEFORE UPDATE ON storage_drives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS storage_locations_updated_at ON storage_locations;
CREATE TRIGGER storage_locations_updated_at BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE storage_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_drives_read ON storage_drives;
DROP POLICY IF EXISTS storage_drives_insert ON storage_drives;
DROP POLICY IF EXISTS storage_drives_update ON storage_drives;
DROP POLICY IF EXISTS storage_drives_delete ON storage_drives;
CREATE POLICY storage_drives_read ON storage_drives FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY storage_drives_insert ON storage_drives FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY storage_drives_update ON storage_drives FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY storage_drives_delete ON storage_drives FOR DELETE USING (created_by_id = auth.uid());

DROP POLICY IF EXISTS storage_locations_read ON storage_locations;
DROP POLICY IF EXISTS storage_locations_insert ON storage_locations;
DROP POLICY IF EXISTS storage_locations_update ON storage_locations;
DROP POLICY IF EXISTS storage_locations_delete ON storage_locations;
CREATE POLICY storage_locations_read ON storage_locations FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY storage_locations_insert ON storage_locations FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY storage_locations_update ON storage_locations FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY storage_locations_delete ON storage_locations FOR DELETE USING (created_by_id = auth.uid());
