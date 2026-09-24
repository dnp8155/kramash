// dispatchPushNotification — Web push + native push dispatch.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { createVapidJwt, encryptPushPayload } from "../_shared/webPushCrypto.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { userId, title, content, data, tag } = body;
    if (!userId || !title || !content) return Response.json({ error: "userId, title, and content are required" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (userId !== user.id && profile?.role !== "admin") {
      return Response.json({ error: "Forbidden: can only send to yourself" }, { status: 403 });
    }

    const { data: subscriptions } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", userId);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@kramasha.app";

    let sent = 0, failed = 0;
    const payload = JSON.stringify({ title, body: content, data: data || {}, tag: tag || "kramasha-notification" });

    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      for (const sub of subscriptions) {
        if (sub.platform !== "web" || !sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
        try {
          const encrypted = await encryptPushPayload({
            subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            payload
          });
          const vapidJwt = await createVapidJwt({ endpoint: sub.endpoint, vapidPrivateKey, vapidPublicKey, subject: vapidSubject });
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: { Authorization: `vapid t=${vapidJwt},k=${vapidPublicKey}`, TTL: "86400", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" },
            body: encrypted
          });
          if (response.ok || response.status === 201) sent++;
          else if (response.status === 404 || response.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            failed++;
          } else failed++;
        } catch { failed++; }
      }
    }

    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});