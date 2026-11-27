import { withCors } from "../_shared/cors.ts";
// createPaymentOrder — Create Razorpay order for Pro subscription.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { testPaymentsAllowed } from "../_shared/paymentEngine.ts";
import { renewalTooEarly, shortDate } from "../_shared/billingRules.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    // Only the plan option is taken from the app. The price is ALWAYS the fixed price saved for that option in
    // plan_pricings; any amount, currency or discount sent by the browser is ignored.
    const { workspace_id, pricing_id, check_only } = body;
    if (!workspace_id || !pricing_id) return Response.json({ error: "workspace_id and pricing_id are required" }, { status: 400 });

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return Response.json({ error: "Online payment opens soon. Nothing has been charged.", gatewayStatus: "pending" }, { status: 503 });
    }

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "You are not authorized to make payments for this workspace." }, { status: 403 });

    // A suspended workspace can't buy Pro (paying would otherwise lift the suspension; see activateClaimed).
    const { data: ws } = await supabaseAdmin.from("workspaces").select("plan_status").eq("id", workspace_id).maybeSingle();
    if (ws?.plan_status === "suspended") {
      return Response.json({ error: "This workspace is suspended, so plans can't be bought right now. Please contact support." }, { status: 403 });
    }

    // Test keys on the live project: only the test workspace(s) / platform admins see online payment.
    if (!(await testPaymentsAllowed(keyId, workspace_id, user.id))) {
      return Response.json({ error: "Online payment opens soon. Nothing has been charged.", gatewayStatus: "pending" }, { status: 503 });
    }

    if (check_only) return Response.json({ ok: true, configured: true });

    // Paid Pro with more than 30 days left: renewal isn't open yet (checked before any order exists, so nothing is charged).
    const today = new Date().toISOString().slice(0, 10);
    const { data: activeSubs } = await supabaseAdmin.from("workspace_subscriptions")
      .select("source, expires_at").eq("workspace_id", workspace_id).eq("status", "ACTIVE").gte("expires_at", today);
    const early = renewalTooEarly(today, activeSubs || []);
    if (early) {
      return Response.json({
        error: `Your Pro is active until ${shortDate(early.end)}. You can renew from ${shortDate(early.opensOn)}.`,
        renewal_opens_on: early.opensOn,
      }, { status: 409 });
    }

    const { data: pricing } = await supabaseAdmin.from("plan_pricings").select("*").eq("id", pricing_id).single();
    if (!pricing || !pricing.is_active) return Response.json({ error: "Selected pricing option is not available." }, { status: 400 });

    const { data: proPlans } = await supabaseAdmin.from("plans").select("*").eq("code", "PRO");
    const proPlan = (proPlans && proPlans[0]) || null;
    if (!proPlan || pricing.plan_id !== proPlan.id) return Response.json({ error: "Selected pricing is not a Pro plan option." }, { status: 400 });

    const auth = btoa(`${keyId}:${keySecret}`);
    const price = Number(pricing.price);
    if (!(price > 0)) return Response.json({ error: "Selected pricing option is not available." }, { status: 400 });
    const amountInPaise = Math.round(price * 100);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInPaise, currency: pricing.currency || "INR",
        receipt: `rcpt_${Date.now()}`,
        // Readable plan details on the order in the Razorpay dashboard (and its exports), next to the ids.
        notes: {
          workspace_id, pricing_id, plan_id: proPlan.id, user_id: user.id,
          plan: "Kramasha Pro",
          billing_cycle: String(pricing.billing_cycle || ""),
          duration: `${pricing.duration_months || 1} month${(pricing.duration_months || 1) > 1 ? "s" : ""}`,
        }
      })
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return Response.json({ error: "Failed to create payment order. Please try again.", details: err }, { status: 502 });
    }

    const order = await orderRes.json();

    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        workspace_id, plan_id: proPlan.id, pricing_id: pricing.id,
        amount: pricing.price, currency: pricing.currency || "INR",
        gateway: "razorpay", gateway_order_id: order.id,
        billing_cycle_snapshot: pricing.billing_cycle, status: "CREATED"
      })
      .select("*")
      .single();

    return Response.json({ ok: true, order_id: order.id, key_id: keyId, payment_id: payment.id, amount: pricing.price, currency: pricing.currency || "INR" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));