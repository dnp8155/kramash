-- ============================================================
-- 0078 — Payment records can only come from Kramasha's server
--
-- Before: any signed-in user could INSERT a row into subscription_payments (the policy only checked created_by_id,
-- which a trigger fills in), for any workspace, with any status, pricing or Razorpay order id. Together with a valid
-- Razorpay signature that let one real payment be claimed several times, and let fake "Paid" rows (with receipts)
-- appear in a payment history.
-- After: the app can only READ its own payment history. Rows are created and changed only by the edge functions
-- createPaymentOrder / verifyPayment / handleRazorpayWebhook (service role, which RLS does not apply to).
-- Each Razorpay order id can belong to one payment row only.
--
-- Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS spay_insert ON subscription_payments;

-- One row per Razorpay order. Skipped (with a notice) if old duplicate rows exist, so the rest still applies;
-- an admin can clean those up and run this again.
DO $$
BEGIN
  IF EXISTS (
    SELECT gateway_order_id FROM subscription_payments
    WHERE gateway_order_id IS NOT NULL AND gateway_order_id <> ''
    GROUP BY gateway_order_id HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'subscription_payments has duplicate gateway_order_id values; unique index not created.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_order
      ON subscription_payments (gateway_order_id)
      WHERE gateway_order_id IS NOT NULL AND gateway_order_id <> '';
  END IF;
END $$;

-- Looking up whether a Razorpay payment id was already used.
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_id
  ON subscription_payments (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL AND gateway_payment_id <> '';
