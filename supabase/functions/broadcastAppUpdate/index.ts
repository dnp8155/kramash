import { withCors } from "../_shared/cors.ts";
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import webpush from "npm:web-push";

// broadcastAppUpdate — Broadcasts release or announcement notifications to all registered devices.
// Can be called by an admin OR via CRON_SECRET header for automated CI/CD git push pipelines.
function isAuthorized(req: Request, adminUser: any): boolean {
  if (adminUser) return true;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  return !!cronSecret && headerSecret === cronSecret;
}

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
      isAdmin = profile?.role === "admin";
    }

    if (!isAuthorized(req, isAdmin)) {
      return Response.json({ error: "Unauthorized: Admin or secret required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const version = body?.version || "1.1.7";
    const title = body?.title || `🚀 Kramasha v${version} Live!`;
    const content = body?.content || "New PDF styles, saved passwords, quotation link toggle and support tickets. Tap to update!";
    const targetUrl = body?.url || "/app-updates";
    const tag = `kramasha-release-${version}`;

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim().replace(/['"]/g, "");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim().replace(/['"]/g, "");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")?.trim().replace(/['"]/g, "") || "mailto:noreply@kramasha.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    // Fetch all active push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*");

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ ok: true, sent: 0, failed: 0, message: "No active push subscriptions" });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title,
      body: content,
      data: { url: targetUrl },
      tag
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      if (!sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
          },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Unregister expired token
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    }

    return Response.json({
      ok: true,
      version,
      sent,
      failed,
      totalSubscriptions: subscriptions.length
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
