-- Read-only mode for a suspended workspace.
-- Once an admin suspends a workspace (workspaces.plan_status = 'suspended'), signed-in users can still read everything
-- but can no longer add, change or delete its data. Server functions (service role) and admin tools are not affected,
-- and support tickets / notifications / upgrade requests stay writable so the owner can still ask for help.
-- The app shows a friendly message first (src/lib/suspension.js); this is the lock that cannot be worked around.

CREATE OR REPLACE FUNCTION block_writes_when_suspended()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws uuid;
BEGIN
  -- Only direct writes from a signed-in user are held back.
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'workspaces' THEN
    ws := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  ELSE
    ws := CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD) ->> 'workspace_id')::uuid ELSE (to_jsonb(NEW) ->> 'workspace_id')::uuid END;
  END IF;

  IF ws IS NOT NULL AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = ws AND w.plan_status = 'suspended') THEN
    RAISE EXCEPTION 'This workspace is suspended. You can view and export your data, but not make changes. Please contact support.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Every table that carries a workspace_id (including ones added in later migrations), except the few the owner
-- must still be able to use while suspended.
DO $$
DECLARE
  t text;
  skip text[] := ARRAY[
    'workspace_members', 'workspace_subscriptions', 'subscription_payments', 'upgrade_requests',
    'support_tickets', 'support_ticket_messages', 'notifications', 'push_subscriptions',
    'user_auth_credentials', 'audit_logs', 'storage_usage', 'profiles'
  ];
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'workspace_id' AND c.table_name <> ALL (skip)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_block_when_suspended', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION block_writes_when_suspended()',
      t || '_block_when_suspended', t
    );
  END LOOP;
END $$;

-- The workspace's own row (settings, name, preferences) is read-only too.
DROP TRIGGER IF EXISTS workspaces_block_when_suspended ON workspaces;
CREATE TRIGGER workspaces_block_when_suspended
  BEFORE UPDATE OR DELETE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION block_writes_when_suspended();
