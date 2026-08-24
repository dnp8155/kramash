// Payment service — client-side calls to backend payment functions.
import { base44 } from "@/api/base44Client";

// Create a payment order and get the Stripe Checkout URL.
export async function createPaymentOrder(workspaceId, pricingId) {
  const res = await base44.functions.invoke("createPaymentOrder", {
    workspace_id: workspaceId,
    pricing_id: pricingId
  });
  return res;
}

// Verify a payment after returning from Stripe checkout.
export async function verifyPayment(sessionId) {
  const res = await base44.functions.invoke("verifyPayment", {
    session_id: sessionId
  });
  return res;
}

// Check if the payment gateway is configured (honest status).
// Returns true if the backend successfully creates an order, false if it
// returns the "not configured" 503 error.
export async function checkGatewayAvailability(workspaceId, pricingId) {
  try {
    await createPaymentOrder(workspaceId, pricingId);
    return true;
  } catch (e) {
    return false;
  }
}