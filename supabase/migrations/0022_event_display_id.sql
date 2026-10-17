-- ============================================================
-- 0022 — Per-FY sequential display IDs for events
-- Replaces the "#<last 4 of uuid>" shown in the UI with a
-- human-readable, workspace + fiscal-year scoped number like
-- "01-2026" (1st event/project created in FY 2026-27).
--
-- Sequence numbers come from a dedicated counter table that is
-- only ever incremented, never re-read from existing rows — so a
-- deleted event's number is never reused and numbers never repeat.
-- ============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS display_id TEXT;

-- ============================================================
-- Counter table: one row per (workspace, fy_year), monotonically
-- incrementing. RLS is enabled with no policies — the only way to
-- touch it is through the SECURITY DEFINER function below, so
-- clients can never read, forge, or roll back a sequence number.
-- ============================================================
CREATE TABLE IF NOT EXISTS event_number_counters (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fy_year TEXT NOT NULL,
  next_seq INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (workspace_id, fy_year)
);

ALTER TABLE event_number_counters ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- next_event_display_id(workspace_id, fy_year)
-- Atomically claims the next sequence number for a workspace+FY
-- and formats it as "01-2026". INSERT ... ON CONFLICT DO UPDATE
-- takes a row lock, so concurrent inserts can't claim the same
-- number. SECURITY DEFINER lets it write to event_number_counters
-- on behalf of whichever role is inserting/updating an event.
-- ============================================================
CREATE OR REPLACE FUNCTION next_event_display_id(p_workspace_id UUID, p_fy_year TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO event_number_counters (workspace_id, fy_year, next_seq)
  VALUES (p_workspace_id, p_fy_year, 2)
  ON CONFLICT (workspace_id, fy_year)
  DO UPDATE SET next_seq = event_number_counters.next_seq + 1
  RETURNING next_seq - 1 INTO v_seq;
  RETURN lpad(v_seq::text, 2, '0') || '-' || p_fy_year;
END;
$$;

-- ============================================================
-- Backfill existing events, oldest-first per workspace, so the
-- numbering they get lines up with creation order and the counter
-- table is primed for the trigger below to continue from.
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_fy_year TEXT;
BEGIN
  FOR r IN
    SELECT id, workspace_id, financial_year, start_date
    FROM events
    WHERE display_id IS NULL
    ORDER BY workspace_id, created_at ASC
  LOOP
    v_fy_year := COALESCE(substring(r.financial_year from '^\d{4}'), to_char(r.start_date, 'YYYY'));
    UPDATE events SET display_id = next_event_display_id(r.workspace_id, v_fy_year) WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE events ADD CONSTRAINT events_workspace_display_id_unique UNIQUE (workspace_id, display_id);

-- ============================================================
-- Assign display_id server-side on every insert, regardless of
-- creation path (direct table insert, edge function, lead
-- conversion) and regardless of what the client sends — a client
-- can never choose or spoof its own number.
-- ============================================================
CREATE OR REPLACE FUNCTION set_event_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_fy_year TEXT;
BEGIN
  v_fy_year := COALESCE(substring(NEW.financial_year from '^\d{4}'), to_char(NEW.start_date, 'YYYY'));
  NEW.display_id := next_event_display_id(NEW.workspace_id, v_fy_year);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_set_display_id ON events;
CREATE TRIGGER trg_events_set_display_id
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_display_id();

-- Once assigned, display_id is immutable — silently ignore any
-- attempt (accidental or otherwise) to change it via UPDATE.
CREATE OR REPLACE FUNCTION lock_event_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.display_id := OLD.display_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_lock_display_id ON events;
CREATE TRIGGER trg_events_lock_display_id
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION lock_event_display_id();
