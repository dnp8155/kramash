-- "Mark as settled": the owner has closed an event/project's dues (e.g. a small leftover balance they
-- don't want to chase). Settled events stop producing reminders and notifications; no money data changes.
ALTER TABLE events ADD COLUMN IF NOT EXISTS settled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
