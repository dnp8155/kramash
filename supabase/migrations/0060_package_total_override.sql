-- ============================================================
-- 0060 — Packages: an optional price you charge for the whole package.
-- Empty (NULL) means "use the items' total", so every existing package behaves exactly as before.
-- When set, the difference to the items' total is the margin; applying the package to a quotation
-- sets the quotation's manual subtotal to this price.
-- ============================================================

ALTER TABLE quotation_packages
  ADD COLUMN IF NOT EXISTS total_override NUMERIC;
