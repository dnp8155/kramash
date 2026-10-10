// Web push delivery for server-initiated notifications (cron reminders).
// dispatchPushNotification needs a signed-in user, so jobs with no user session send through here.
import { supabaseAdmin } from "./supabaseClient.ts";
import webpush from "npm:web-push";

export async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, unknown> = {}, tag = "kramasha-notification") {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim().replace(/['"]/g, "");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim().replace(/['"]/g, "");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")?.trim().replace(/['"]/g, "") || "mailto:noreply@kramasha.app";
  if (!vapidPublicKey || !vapidPrivateKey) return { sent: 0, failed: 0 };

  const { data: subscriptions } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 };

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({ title, body, data, tag });
  let sent = 0, failed = 0;
  for (const sub of subscriptions) {
    if (sub.platform !== "web" || !sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } }, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
      }
      failed++;
    }
  }
  return { sent, failed };
}
