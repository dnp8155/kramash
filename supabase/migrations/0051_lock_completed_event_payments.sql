-- ============================================================
-- 0051 — Lock the payments of completed jobs
--
-- Once an event/project is Completed or Settled, its money entries (received from the client, paid to team,
-- expenses linked to it) can no longer be deleted or have their amount / date / type changed. They can only be
-- VOIDED, by the workspace owner, with a written reason. A voided entry stays in the books (status VOID, with
-- who / when / why) and shows in reports and Excel. New payments can still be added to a completed job.
--
-- • financial_transactions: void_reason, voided_at, voided_by_id.
-- • transaction_changes: a permanent history of voids, owner data-deletions and re-openings of locked jobs.
-- • guard_locked_transactions(): BEFORE UPDATE/DELETE trigger that enforces the rule in the database, so it
--   cannot be skipped by calling the API directly. Backend jobs using the service role (no signed-in user) are
--   not blocked — they do their own checks.
-- • guard_locked_event_delete(): a completed job that has money entries cannot be deleted (re-open it first —
--   that is recorded).
-- • log_event_reopen(): records when a Completed / Settled job is moved back (which unlocks its payments).
-- • owner_delete_transactions(): the only way to bulk-delete locked entries (Preferences → Data Deletion); owner
--   only, and every row removed is saved in transaction_changes first.
-- Safe to re-run.
-- ============================================================

ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS voided_by_id UUID;

CREATE TABLE IF NOT EXISTS transaction_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID,
  transaction_id UUID,
  action TEXT NOT NULL,                       -- void | delete | reopen
  reason TEXT,
  snapshot JSONB,                             -- the entry as it was
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_changes_workspace ON transaction_changes (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_changes_event ON transaction_changes (event_id);

ALTER TABLE transaction_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transaction_changes_read ON transaction_changes;
-- Readable by the workspace owner (and the person who made the change). Rows are written only by the triggers below.
CREATE POLICY transaction_changes_read ON transaction_changes FOR SELECT
  USING (actor_id = auth.uid() OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = transaction_changes.workspace_id AND w.owner_user_id = auth.uid()));

-- A job is locked when it is Completed or marked Settled. A missing event counts as not locked.
CREATE OR REPLACE FUNCTION event_is_locked(p_event UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT (e.status::text = 'completed') OR COALESCE(e.settled, false) FROM events e WHERE e.id = p_event), false);
$$;

CREATE OR REPLACE FUNCTION guard_locked_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  bypass BOOLEAN := COALESCE(current_setting('app.lock_bypass', true), '') = '1';
  passthrough RECORD;
BEGIN
  -- NEW does not exist in a DELETE trigger, so it is only touched inside an UPDATE branch.
  IF TG_OP = 'DELETE' THEN
    passthrough := OLD;
  ELSE
    passthrough := NEW;
    -- Stamp who / when on every void (locked job or not).
    IF NEW.status::text = 'VOID' AND OLD.status::text <> 'VOID' THEN
      NEW.voided_at := now();
      NEW.voided_by_id := uid;
      passthrough := NEW;
    END IF;
  END IF;

  -- Backend jobs (no signed-in user) and the owner data-deletion function are not blocked here.
  IF uid IS NULL OR bypass THEN RETURN passthrough; END IF;

  -- Entries of unlinked, missing or open jobs — and anything being removed along with its workspace — are free.
  IF OLD.event_id IS NULL OR NOT event_is_locked(OLD.event_id)
     OR NOT EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id) THEN
    RETURN passthrough;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'LOCKED_EVENT: This job is completed, so its payments can no longer be deleted. Void the entry with a reason instead.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Voiding a locked entry: owner only, with a reason, and nothing else may change in the same update.
  IF NEW.status::text = 'VOID' AND OLD.status::text = 'ACTIVE' THEN
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id AND owner_user_id = uid) THEN
      RAISE EXCEPTION 'LOCKED_EVENT_OWNER_ONLY: This job is completed. Only the workspace owner can void its payments.'
        USING ERRCODE = 'P0001';
    END IF;
    IF btrim(COALESCE(NEW.void_reason, '')) = '' THEN
      RAISE EXCEPTION 'VOID_REASON_REQUIRED: Please give a reason for voiding a payment on a completed job.'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.transaction_date IS DISTINCT FROM OLD.transaction_date
       OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
      RAISE EXCEPTION 'LOCKED_EVENT: This job is completed, so the amount and date can no longer be changed.'
        USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO transaction_changes (workspace_id, event_id, transaction_id, action, reason, snapshot, actor_id)
    VALUES (OLD.workspace_id, OLD.event_id, OLD.id, 'void', NEW.void_reason, to_jsonb(OLD), uid);
    RETURN NEW;
  END IF;

  -- Everything else on a locked entry: amount, date, type, status (un-voiding) and the linked job are fixed.
  -- Notes, reference number and payment method may still be corrected.
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.transaction_date IS DISTINCT FROM OLD.transaction_date
     OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'LOCKED_EVENT: This job is completed, so the amount, date and type of its payments are locked. Void the entry (with a reason) and add the correct one.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_locked_transactions_trg ON financial_transactions;
CREATE TRIGGER guard_locked_transactions_trg
  BEFORE UPDATE OR DELETE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION guard_locked_transactions();

-- A completed job that still has money entries cannot be deleted (that would detach them from the job).
CREATE OR REPLACE FUNCTION guard_locked_event_delete()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE(current_setting('app.lock_bypass', true), '') = '1' THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id) THEN RETURN OLD; END IF;
  IF (OLD.status::text = 'completed' OR COALESCE(OLD.settled, false))
     AND EXISTS (SELECT 1 FROM financial_transactions WHERE event_id = OLD.id) THEN
    RAISE EXCEPTION 'LOCKED_EVENT_DELETE: This job is completed and has payment records, so it cannot be deleted. Re-open it first (this is recorded).'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_locked_event_delete_trg ON events;
CREATE TRIGGER guard_locked_event_delete_trg
  BEFORE DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION guard_locked_event_delete();

-- Moving a Completed / Settled job back unlocks its payments, so it is written to the history.
CREATE OR REPLACE FUNCTION log_event_reopen()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (OLD.status::text = 'completed' OR COALESCE(OLD.settled, false))
     AND NOT (NEW.status::text = 'completed' OR COALESCE(NEW.settled, false)) THEN
    INSERT INTO transaction_changes (workspace_id, event_id, action, reason, actor_id)
    VALUES (NEW.workspace_id, NEW.id, 'reopen', 'Job re-opened — its payments are unlocked', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_event_reopen_trg ON events;
CREATE TRIGGER log_event_reopen_trg
  AFTER UPDATE OF status, settled ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_reopen();

-- Owner-only bulk delete used by Preferences → Data Deletion. Every row is saved to the history first.
CREATE OR REPLACE FUNCTION owner_delete_transactions(p_workspace UUID, p_ids UUID[], p_reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace AND owner_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the workspace owner can delete transactions.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO transaction_changes (workspace_id, event_id, transaction_id, action, reason, snapshot, actor_id)
  SELECT t.workspace_id, t.event_id, t.id, 'delete', p_reason, to_jsonb(t), auth.uid()
  FROM financial_transactions t
  WHERE t.workspace_id = p_workspace AND t.id = ANY (p_ids);

  PERFORM set_config('app.lock_bypass', '1', true);
  DELETE FROM financial_transactions WHERE workspace_id = p_workspace AND id = ANY (p_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.lock_bypass', '', true);
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION owner_delete_transactions(UUID, UUID[], TEXT) TO authenticated;
