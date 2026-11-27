import { withCors } from "../_shared/cors.ts";
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
// Pinned: an unpinned "npm:web-push" picked up a newer release on 14 Nov 2026 that has no default export → BOOT_ERROR.
import webpush from "npm:web-push@3.6.7";

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
    // No version given: a plain announcement (the old fallback named v1.1.7 and its features).
    const version = body?.version ? String(body.version) : "";
    const title = body?.title || (version ? `🚀 Kramasha v${version} Live!` : "🚀 A new Kramasha update is live!");
    const content = body?.content || "Tap to see what's new.";
    const targetUrl = body?.url || "/app-updates";
    const tag = `kramasha-release-${version || "latest"}`;

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

    // People who switched Push off get no announcement either.
    const userIds = [...new Set(subscriptions.map((s: any) => s.user_id).filter(Boolean))];
    const pushOff = new Set<string>();
    for (let i = 0; i < userIds.length; i += 200) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, notification_preferences").in("id", userIds.slice(i, i + 200));
      for (const p of profs || []) if (p?.notification_preferences?.push === false) pushOff.add(p.id);
    }
    // One send per device, even if the same browser is saved under two accounts.
    const seen = new Set<string>();
    const targets = subscriptions.filter((sub: any) => {
      if (!sub.endpoint || !sub.p256dh_key || !sub.auth_key || pushOff.has(sub.user_id) || seen.has(sub.endpoint)) return false;
      seen.add(sub.endpoint);
      return true;
    });

    // Sent 20 at a time: one by one could reach the function's time limit with many devices.
    const sendOne = async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          payload,
          { TTL: 3 * 24 * 3600 }
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Unregister expired token
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    };
    for (let i = 0; i < targets.length; i += 20) {
      await Promise.all(targets.slice(i, i + 20).map(sendOne));
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
