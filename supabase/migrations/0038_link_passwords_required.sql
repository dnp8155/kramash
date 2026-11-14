-- ============================================================
-- 0038 — Every shared quotation / invoice link is password-protected
--
-- * invoices.client_access_password : an invoice's own password (used when it has no quotation, or the admin
--   wants a different one). An invoice also accepts its quotation's password and the client's portal password.
-- * Links that are already shared but have NO password anywhere get one now, so nothing stays open. The admin
--   sees it on the quotation / invoice page and sends it to the client (clients can't open the link until then).
-- Run this in the Supabase SQL Editor AFTER 0036 and 0037. Safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_access_password TEXT;

-- 8 characters, no look-alikes (same alphabet the app uses).
CREATE OR REPLACE FUNCTION portal_random_password() RETURNS TEXT
LANGUAGE sql VOLATILE
SET search_path TO public, extensions
AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1), '')
  FROM generate_series(1, 8);
$$;

-- Quotations that are shared but unprotected (no own password, and the client has no saved portal password).
UPDATE quotations q
SET client_access_password = portal_random_password()
WHERE COALESCE(q.public_token, '') <> ''
  AND (COALESCE(q.public_link_enabled, false) OR COALESCE(q.quotation_link_enabled, false))
  AND COALESCE(q.client_access_password, '') = ''
  AND NOT EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = q.client_id AND COALESCE(c.portal_access_enabled, false) AND COALESCE(c.portal_password_hash, '') <> ''
  );

-- Invoices that are shared but unprotected (no own password, no quotation password, no client portal password).
UPDATE invoices i
SET client_access_password = portal_random_password()
WHERE COALESCE(i.public_token, '') <> ''
  AND COALESCE(i.public_link_enabled, false)
  AND COALESCE(i.client_access_password, '') = ''
  AND NOT EXISTS (
    SELECT 1 FROM quotations q WHERE q.id = i.quotation_id AND COALESCE(q.client_access_password, '') <> ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = i.client_id AND COALESCE(c.portal_access_enabled, false) AND COALESCE(c.portal_password_hash, '') <> ''
  );
