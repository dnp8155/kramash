-- ============================================================
-- 0040 — Support tickets: let the platform team read and answer them
--
-- Before: a user could submit a ticket and read their own, but platform admins could only UPDATE tickets —
-- the read policy was "own tickets only", so nobody on the team could actually see what users sent.
-- Now:
--   * admins can read every ticket (for the new Admin → Support Tickets page)
--   * users can only create OPEN tickets without a response (they can't pre-resolve or answer their own)
--   * resolved_at is stamped automatically when a ticket is resolved / closed and cleared when it is reopened
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS st_read ON support_tickets;
CREATE POLICY st_read ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS st_insert ON support_tickets;
CREATE POLICY st_insert ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_response IS NULL);

CREATE OR REPLACE FUNCTION set_ticket_resolved_at() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND (OLD.status IS NULL OR OLD.status NOT IN ('resolved', 'closed')) THEN
    NEW.resolved_at := now();
  ELSIF NEW.status IN ('open', 'in_progress') THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_resolved_at ON support_tickets;
CREATE TRIGGER support_tickets_resolved_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_ticket_resolved_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created ON support_tickets(status, created_at DESC);
