import { withCors } from "../_shared/cors.ts";
// dispatchPushNotification — Web push + native push dispatch.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import webpush from "npm:web-push";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { userId, title, content, data, tag } = body;
    if (!userId || !title || !content) return Response.json({ error: "userId, title, and content are required" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("role, notification_preferences").eq("id", user.id).single();
    if (userId !== user.id && profile?.role !== "admin") {
      return Response.json({ error: "Forbidden: can only send to yourself" }, { status: 403 });
    }

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("notification_preferences").eq("id", userId).single();
    const targetPrefs = targetProfile?.notification_preferences || { push: true };
    if (targetPrefs.push === false) {
      return Response.json({ sent: 0, failed: 0, skipped: true, reason: "Push notifications disabled by user" });
    }

    const { data: subscriptions } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", userId);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim().replace(/['"]/g, "");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim().replace(/['"]/g, "");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")?.trim().replace(/['"]/g, "") || "mailto:noreply@kramasha.app";

    let sent = 0, failed = 0;
    const payload = JSON.stringify({ title, body: content, data: data || {}, tag: tag || "kramasha-notification" });

    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      for (const sub of subscriptions) {
        if (sub.platform !== "web" || !sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
          };
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
          failed++;
        }
      }
    }

    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));