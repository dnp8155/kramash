import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: "subscription with endpoint is required" }, { status: 400 });
    }

    // Check if subscription already exists (by endpoint)
    const existing = await base44.entities.PushSubscription.filter({
      user_id: user.id,
      endpoint: subscription.endpoint,
    });

    if (existing && existing.length > 0) {
      // Update existing subscription keys (they may have changed)
      const updated = await base44.entities.PushSubscription.update(existing[0].id, {
        p256dh_key: subscription.keys?.p256dh || existing[0].p256dh_key,
        auth_key: subscription.keys?.auth || existing[0].auth_key,
      });
      return Response.json({ success: true, subscription: updated });
    }

    // Create new subscription
    const created = await base44.entities.PushSubscription.create({
      user_id: user.id,
      platform: "web",
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys?.p256dh || "",
      auth_key: subscription.keys?.auth || "",
    });

    return Response.json({ success: true, subscription: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}