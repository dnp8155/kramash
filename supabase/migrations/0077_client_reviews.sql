-- ============================================================
-- 0077 — Client reviews, one per client (like a Google review)
--
-- Once any of a client's events is over (marked Completed, or its last date has passed), the client can rate the
-- business (1–5 stars, optional text) from the Client Portal, the project portal (/portal/…) or the Track page.
-- Without a portal, the owner can send the client their own review link (/review/<review_token>), which works any time.
-- One review per client: they can edit it any time, and when another of their events is over they are asked to update it.
-- Only the edge function submitEventReview writes it (service role, after checking the client's link or portal
-- session). The owner decides whether it shows on the public My Profile page (review_on_profile); it stays on after
-- the client edits it.
--
-- Safe to re-run. The app keeps working before this is run (no review card, no reviews list).
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_rating SMALLINT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_text TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_created_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_updated_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_on_profile BOOLEAN NOT NULL DEFAULT FALSE;
-- The client's own review link, made by the app the first time the owner copies or shares it.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_review_token ON clients (review_token) WHERE review_token IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_review_rating_range') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_review_rating_range CHECK (review_rating IS NULL OR review_rating BETWEEN 1 AND 5);
  END IF;
END $$;

-- The public profile's list: reviews the owner picked, newest first.
CREATE INDEX IF NOT EXISTS idx_clients_reviews_on_profile
  ON clients (workspace_id, review_updated_at DESC)
  WHERE review_on_profile = TRUE AND review_rating IS NOT NULL;

-- Reviews are the client's words: the app (signed-in users) can never write or change them, only the edge function
-- submitEventReview (service role) can. The owner may still switch review_on_profile and make the review_token.
-- Changes from the app are quietly put back, so other saves of the client row keep working.
CREATE OR REPLACE FUNCTION protect_client_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    NEW.review_rating := OLD.review_rating;
    NEW.review_text := OLD.review_text;
    NEW.review_created_at := OLD.review_created_at;
    NEW.review_updated_at := OLD.review_updated_at;
    -- A review link, once made, stays the same (links already sent keep working).
    IF OLD.review_token IS NOT NULL AND OLD.review_token <> '' THEN
      NEW.review_token := OLD.review_token;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_protect_review ON clients;
CREATE TRIGGER clients_protect_review BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION protect_client_review();

-- A new client never starts with a review typed in by the app.
CREATE OR REPLACE FUNCTION protect_client_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    NEW.review_rating := NULL;
    NEW.review_text := '';
    NEW.review_created_at := NULL;
    NEW.review_updated_at := NULL;
    NEW.review_on_profile := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_protect_review_insert ON clients;
CREATE TRIGGER clients_protect_review_insert BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION protect_client_review_insert();
