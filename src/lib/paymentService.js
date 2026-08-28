// Payment service — client-side calls to backend payment functions.
import { base44 } from "@/api/base44Client";

// Create a Razorpay order (or just check gateway availability with check_only).
export async function createPaymentOrder(workspaceId, pricingId, checkOnly = false) {
  const res = await base44.functions.invoke("createPaymentOrder", {
    workspace_id: workspaceId,
    pricing_id: pricingId,
    check_only: checkOnly
  });
  return res;
}

// Verify a Razorpay payment after checkout modal closes.
export async function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const res = await base44.functions.invoke("verifyPayment", {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature
  });
  return res;
}

// Check if the payment gateway is configured (honest status).
export async function checkGatewayAvailability(workspaceId, pricingId) {
  try {
    const res = await createPaymentOrder(workspaceId, pricingId, true);
    return res?.configured === true;
  } catch (e) {
    return false;
  }
}

// Load Razorpay checkout script dynamically.
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout. Please check your internet connection."));
    document.body.appendChild(script);
  });
}

// Open Razorpay checkout modal and return payment response.
export async function openRazorpayCheckout({ orderId, keyId, amount, currency, name, description, prefill }) {
  await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    const options = {
      key_id: keyId,
      amount: Math.round(amount * 100), // paise
      currency: currency || "INR",
      name: name || "KRAMAS",
      description: description || "Pro Plan Subscription",
      order_id: orderId,
      handler: (response) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error("Payment cancelled"));
        }
      },
      theme: {
        color: "#1e3a5f"
      }
    };
    if (prefill) {
      options.prefill = prefill;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}