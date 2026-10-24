-- ============================================================
-- 0048 — Lead manager: activity timeline, lost reason, last contact
--
-- • lead_activities: a per-lead history (notes, calls, WhatsApp messages, status changes, follow-ups).
--   Same privacy rule as leads: only the user who created a row can see or change it.
-- • leads.lost_reason: why a lead was lost (for the pipeline summary).
-- • leads.last_contacted_at: when you last called / messaged the lead.
-- Safe to re-run.
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note',          -- note | call | whatsapp | status | followup
  body TEXT,
  from_status TEXT,
  to_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_workspace ON lead_activities (workspace_id);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_activities_read ON lead_activities;
DROP POLICY IF EXISTS lead_activities_insert ON lead_activities;
DROP POLICY IF EXISTS lead_activities_update ON lead_activities;
DROP POLICY IF EXISTS lead_activities_delete ON lead_activities;
CREATE POLICY lead_activities_read ON lead_activities FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY lead_activities_insert ON lead_activities FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY lead_activities_update ON lead_activities FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY lead_activities_delete ON lead_activities FOR DELETE USING (created_by_id = auth.uid());
