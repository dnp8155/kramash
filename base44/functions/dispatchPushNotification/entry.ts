import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { createVapidJwt, encryptPushPayload } from "../../shared/webPushCrypto.ts";

function getSecret(name) {
  try {
    return secrets.get(name) || null;
  } catch {
    return null;
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { userId, title, content, data, tag } = body;

    if (!userId || !title || !content) {
      return Response.json({ error: "userId, title, and content are required" }, { status: 400 });
    }

    // Only admins can dispatch to other users; regular users can only send to themselves (for testing)
    if (userId !== user.id && user.role !== "admin") {
      return Response.json({ error: "Forbidden: can only send to yourself" }, { status: 403 });
    }

    // Look up the target user's web push subscriptions
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_id: userId,
    });

    const vapidPublicKey = getSecret("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = getSecret("VAPID_PRIVATE_KEY");
    const vapidSubject = getSecret("VAPID_SUBJECT") || "mailto:noreply@kramasha.app";

    let sent = 0;
    let failed = 0;
    const payload = JSON.stringify({
      title,
      body: content,
      data: data || {},
      tag: tag || "kramasha-notification",
    });

    // Web push
    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      for (const sub of subscriptions) {
        if (sub.platform !== "web" || !sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
        try {
          const encrypted = await encryptPushPayload({
            subscription: {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
            },
            payload,
          });

          const vapidJwt = await createVapidJwt({
            endpoint: sub.endpoint,
            vapidPrivateKey,
            vapidPublicKey,
            subject: vapidSubject,
          });

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: `vapid t=${vapidJwt},k=${vapidPublicKey}`,
              TTL: "86400",
              "Content-Encoding": "aes128gcm",
              "Content-Type": "application/octet-stream",
            },
            body: encrypted,
          });

          if (response.ok || response.status === 201) {
            sent++;
          } else if (response.status === 404 || response.status === 410) {
            // Subscription expired — delete it
            await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
            failed++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    }

    // Native push (best-effort — silently fails if no native build or credentials)
    try {
      await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: userId,
        title,
        content,
        action_label: data?.actionLabel,
        action_url: data?.actionUrl,
      });
      sent++;
    } catch {
      // Native push not configured or failed — non-fatal
    }

    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}