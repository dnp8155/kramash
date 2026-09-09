import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  resolveActiveSubscription,
  getPlanByCode,
  getPricingById,
  computeExpiry,
  todayStr,
  verifyWorkspaceMembership,
} from '../../shared/planUtils.ts';

// Subscription payment backend function.
//
// Actions:
//   - create_checkout: Creates a Stripe Checkout Session for a Pro pricing
//     option. The amount is resolved from the trusted PlanPricing record —
//     never from the client request.
//   - verify: Verifies a Stripe Checkout Session / Payment Intent after the
//     user returns from checkout. Activates the subscription only after
//     backend verification confirms payment success.
//   - status: Returns the current payment + subscription status for a workspace.
//
// Secrets required (set in dashboard → environment variables):
//   - STRIPE_SECRET_KEY
//
// When STRIPE_SECRET_KEY is absent the function returns 503 so the UI can
// surface a clear "payment gateway not configured" state and fall back to
// the admin upgrade request flow.

const STRIPE_API = "https://api.stripe.com/v1";

function stripeEnabled(): boolean {
  return !!secrets.get('STRIPE_SECRET_KEY');
}

function stripeAuth(): string {
  return 'Bearer ' + secrets.get('STRIPE_SECRET_KEY');
}

// Idempotency: check if a payment for this gateway_payment_id was already
// processed. Prevents duplicate subscription activations from repeated
// callbacks or double-verify.
async function findExistingPayment(base44, gatewayPaymentId: string) {
  const existing = await base44.asServiceRole.entities.SubscriptionPayment.filter(
    { gateway_payment_id: gatewayPaymentId, status: "SUCCESS" },
    "-created_date",
    1
  );
  return (existing && existing.length > 0) ? existing[0] : null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action;

    // ─── Check gateway configuration ───
    if (!stripeEnabled()) {
      return Response.json(
        {
          error: 'Payment gateway is not configured yet. A Stripe account is required.',
          configured: false,
        },
        { status: 503 }
      );
    }

    // ─── create_checkout ───
    if (action === 'create_checkout') {
      const { pricing_id } = body;
      if (!pricing_id) return Response.json({ error: 'pricing_id is required' }, { status: 400 });

      // Resolve the workspace from the user's membership.
      const workspaceId = body.workspace_id;
      if (!workspaceId) return Response.json({ error: 'workspace_id is required' }, { status: 400 });

      // Verify the user is a member of this workspace.
      const isMember = await verifyWorkspaceMembership(base44, user.id, workspaceId);
      if (!isMember) {
        return Response.json({ error: 'You are not authorized to make payments for this workspace' }, { status: 403 });
      }

      // Resolve the pricing from the trusted database — never trust client amount.
      const pricing = await getPricingById(base44, pricing_id);
      if (!pricing) return Response.json({ error: 'Pricing option not found' }, { status: 404 });
      if (!pricing.is_active) return Response.json({ error: 'This pricing option is no longer available' }, { status: 400 });

      // Resolve the Pro plan.
      const proPlan = await getPlanByCode(base44, 'PRO');
      if (!proPlan) return Response.json({ error: 'Pro plan not found' }, { status: 404 });
      if (pricing.plan_id !== proPlan.id) {
        return Response.json({ error: 'Pricing does not belong to the Pro plan' }, { status: 400 });
      }

      // Create a SubscriptionPayment record in CREATED state.
      const payment = await base44.asServiceRole.entities.SubscriptionPayment.create({
        workspace_id: workspaceId,
        plan_id: proPlan.id,
        pricing_id: pricing.id,
        amount: pricing.price,
        currency: pricing.currency || 'INR',
        billing_cycle_snapshot: pricing.billing_cycle,
        gateway: 'STRIPE',
        status: 'CREATED',
        initiated_by_user_id: user.id,
      });

      // Create the Stripe Checkout Session.
      const appUrl = req.headers.get('origin') || 'https://kramashah.app';
      const successUrl = `${appUrl}/plan?payment=success&session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`;
      const cancelUrl = `${appUrl}/plan?payment=cancelled&payment_id=${payment.id}`;

      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('payment_method_types[]', 'card');
      params.append('payment_method_types[]', 'upi');
      params.append('line_items[0][quantity]', '1');
      params.append('line_items[0][price_data][currency]', (pricing.currency || 'INR').toLowerCase());
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(pricing.price * 100)));
      params.append('line_items[0][price_data][product_data][name]', `Kramashah Pro — ${pricing.billing_cycle === 'MONTHLY' ? 'Monthly' : pricing.billing_cycle === 'SIX_MONTHS' ? '6 Months' : 'Annual'}`);
      params.append('client_reference_id', payment.id);
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);

      const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
        method: 'POST',
        headers: {
          Authorization: stripeAuth(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const session = await stripeRes.json();
      if (!stripeRes.ok) {
        // Mark the payment as FAILED.
        await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
          status: 'FAILED',
          failure_reason: session.error?.message || 'Stripe session creation failed',
        });
        return Response.json({ error: session.error?.message || 'Failed to create checkout session' }, { status: 502 });
      }

      // Store the Stripe session ID.
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        gateway_order_id: session.id,
      });

      return Response.json({
        checkout_url: session.url,
        session_id: session.id,
        payment_id: payment.id,
      });
    }

    // ─── verify ───
    if (action === 'verify') {
      const { session_id, payment_id } = body;
      if (!session_id && !payment_id) {
        return Response.json({ error: 'session_id or payment_id is required' }, { status: 400 });
      }

      // Find the payment record.
      let payment;
      if (payment_id) {
        payment = await base44.asServiceRole.entities.SubscriptionPayment.get(payment_id);
      } else {
        const payments = await base44.asServiceRole.entities.SubscriptionPayment.filter(
          { gateway_order_id: session_id },
          "-created_date",
          1
        );
        payment = payments && payments.length > 0 ? payments[0] : null;
      }

      if (!payment) return Response.json({ error: 'Payment record not found' }, { status: 404 });

      // Verify the user owns this payment's workspace.
      const isMember = await verifyWorkspaceMembership(base44, user.id, payment.workspace_id);
      if (!isMember && user.role !== 'admin') {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }

      // If already SUCCESS, return idempotently (no duplicate activation).
      if (payment.status === 'SUCCESS') {
        return Response.json({
          status: 'already_active',
          payment,
          message: 'Payment was already verified. Subscription is active.',
        });
      }

      // Verify the session with Stripe.
      const sessionId = session_id || payment.gateway_order_id;
      if (!sessionId) {
        return Response.json({ error: 'No Stripe session to verify' }, { status: 400 });
      }

      const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
        headers: { Authorization: stripeAuth() },
      });
      const session = await stripeRes.json();

      if (!stripeRes.ok) {
        await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
          status: 'FAILED',
          failure_reason: 'Stripe verification request failed',
        });
        return Response.json({ error: 'Payment verification failed' }, { status: 502 });
      }

      // Check payment status from Stripe.
      if (session.payment_status !== 'paid') {
        // Payment not completed — could be cancelled or pending.
        await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
          status: 'FAILED',
          failure_reason: `Stripe payment_status: ${session.payment_status}`,
        });
        return Response.json({
          status: 'not_paid',
          payment_status: session.payment_status,
          message: 'Payment was not completed. No subscription activated.',
        });
      }

      // ─── Payment verified — activate subscription ───
      // Idempotency: check if this gateway_payment_id was already processed.
      const gatewayPaymentId = session.payment_intent || session.id;
      const existing = await findExistingPayment(base44, gatewayPaymentId);
      if (existing && existing.id !== payment.id) {
        // This payment was already processed under a different record — don't double-activate.
        return Response.json({
          status: 'duplicate',
          message: 'This payment was already processed. No duplicate activation.',
        });
      }

      // Resolve pricing for expiry calculation.
      const pricing = await getPricingById(base44, payment.pricing_id);
      if (!pricing) {
        return Response.json({ error: 'Pricing option not found during verification' }, { status: 500 });
      }

      const proPlan = await getPlanByCode(base44, 'PRO');
      if (!proPlan) return Response.json({ error: 'Pro plan not found' }, { status: 500 });

      const startDate = todayStr();
      const expiresAt = computeExpiry(startDate, pricing.duration_months);

      // Mark the current subscription as CANCELLED (history).
      const currentSub = await resolveActiveSubscription(base44, payment.workspace_id);
      if (currentSub && currentSub.status !== 'EXPIRED') {
        await base44.asServiceRole.entities.WorkspaceSubscription.update(currentSub.id, {
          status: 'CANCELLED',
          reason: 'Replaced by payment gateway purchase',
        });
      }

      // Create the new active subscription.
      const newSub = await base44.asServiceRole.entities.WorkspaceSubscription.create({
        workspace_id: payment.workspace_id,
        plan_id: proPlan.id,
        pricing_id: pricing.id,
        status: 'ACTIVE',
        started_at: startDate,
        expires_at: expiresAt,
        auto_renew: false,
        source: 'PAYMENT_GATEWAY',
        assigned_price: pricing.price,
        billing_cycle_snapshot: pricing.billing_cycle,
        plan_code_snapshot: 'PRO',
        reason: 'Activated via Stripe payment',
      });

      // Update the payment record to SUCCESS.
      const updatedPayment = await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        status: 'SUCCESS',
        gateway_payment_id: gatewayPaymentId,
        subscription_id: newSub.id,
        verified_at: new Date().toISOString(),
      });

      // Sync the workspace denormalized fields.
      await base44.asServiceRole.entities.Workspace.update(payment.workspace_id, {
        plan_type: 'pro',
        plan_status: 'active',
      });

      return Response.json({
        status: 'success',
        payment: updatedPayment,
        subscription: newSub,
        expires_at: expiresAt,
      });
    }

    // ─── status ───
    if (action === 'status') {
      const { payment_id } = body;
      if (!payment_id) return Response.json({ error: 'payment_id is required' }, { status: 400 });
      const payment = await base44.asServiceRole.entities.SubscriptionPayment.get(payment_id);
      if (!payment) return Response.json({ error: 'Payment not found' }, { status: 404 });
      return Response.json({ status: payment.status, payment });
    }

    return Response.json({ error: 'Invalid action. Use create_checkout, verify, or status.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}