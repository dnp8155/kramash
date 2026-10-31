-- Invoices created or edited by hand never had balance_due set, so unpaid invoices showed "Rs 0 due".
-- Recompute it from the total and what has been paid. Safe to re-run.
UPDATE invoices
SET balance_due = GREATEST(0, COALESCE(grand_total, 0) - COALESCE(amount_paid, 0))
WHERE balance_due IS DISTINCT FROM GREATEST(0, COALESCE(grand_total, 0) - COALESCE(amount_paid, 0));
