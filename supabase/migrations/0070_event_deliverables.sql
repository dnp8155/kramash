-- ============================================================
-- 0070 — Track: what you are making for a client, with a status (per event)
--
-- event_deliverables: free-text items with a quantity (e.g. 2 x "Wedding album", "Highlight video") and a status you update
-- yourself: not_started | in_progress | ready | sent | delivered (names of the last two are set in Preferences). Optional note and expected date.
-- The client sees them (read-only) on the event's public tracking link (events.public_tracking_enabled + public_token),
-- served by the getPublicEventData function. Nothing here is readable without that link.
-- Same privacy rule as storage: only the user who created a row can see or change it.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,             -- "2 x Albums"
  status TEXT NOT NULL DEFAULT 'not_started',  -- not_started | in_progress | ready | sent | delivered (the last two are named by the business in Preferences)
  note TEXT,
  expected_date DATE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- Safe if the table was already created without a quantity.
ALTER TABLE event_deliverables ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_event_deliverables_workspace ON event_deliverables (workspace_id);
CREATE INDEX IF NOT EXISTS idx_event_deliverables_event ON event_deliverables (event_id);

DROP TRIGGER IF EXISTS event_deliverables_updated_at ON event_deliverables;
CREATE TRIGGER event_deliverables_updated_at BEFORE UPDATE ON event_deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE event_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_deliverables_read ON event_deliverables;
DROP POLICY IF EXISTS event_deliverables_insert ON event_deliverables;
DROP POLICY IF EXISTS event_deliverables_update ON event_deliverables;
DROP POLICY IF EXISTS event_deliverables_delete ON event_deliverables;
CREATE POLICY event_deliverables_read ON event_deliverables FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY event_deliverables_insert ON event_deliverables FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY event_deliverables_update ON event_deliverables FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY event_deliverables_delete ON event_deliverables FOR DELETE USING (created_by_id = auth.uid());

NOTIFY pgrst, 'reload schema';
