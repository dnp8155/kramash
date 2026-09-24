-- ============================================================
-- Enable Supabase Realtime for all application tables
-- ============================================================
-- This allows client-side realtime subscriptions to receive
-- INSERT/UPDATE/DELETE events via WebSocket, so that data
-- changes (saves, edits, deletes) reflect instantly in the UI
-- without requiring a manual page refresh.
--
-- Run this in the Supabase SQL Editor or as a migration.
-- ============================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'workspaces',
    'workspace_members',
    'clients',
    'leads',
    'events',
    'team_members',
    'team_roles',
    'services',
    'service_providers',
    'event_team_assignments',
    'event_service_assignments',
    'event_day_assignments',
    'team_block_dates',
    'event_reminders',
    'quotations',
    'quotation_items',
    'quotation_packages',
    'quotation_portals',
    'payment_milestones',
    'invoices',
    'invoice_items',
    'financial_years',
    'financial_transactions',
    'expense_categories',
    'job_sheets',
    'job_sheet_portals',
    'notifications',
    'support_tickets',
    'workspace_subscriptions',
    'subscription_payments',
    'upgrade_requests',
    'storage_usage',
    'user_auth_credentials',
    'push_subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Added % to supabase_realtime publication', t;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '% already in supabase_realtime publication', t;
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist yet, skipping', t;
    END;
  END LOOP;
END $$;

-- Set REPLICA IDENTITY FULL on tables where we need old-row data
-- for DELETE events (so the realtime payload includes workspace_id
-- for filtering). Without this, DELETE payloads only contain the PK.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'events',
    'clients',
    'team_members',
    'leads',
    'quotations',
    'invoices',
    'financial_transactions',
    'event_team_assignments',
    'event_service_assignments',
    'event_day_assignments',
    'team_block_dates',
    'payment_milestones',
    'quotation_items',
    'invoice_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      RAISE NOTICE 'Set REPLICA IDENTITY FULL on %', t;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist yet, skipping', t;
    END;
  END LOOP;
END $$;