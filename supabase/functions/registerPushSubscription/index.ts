import { withCors } from "../_shared/cors.ts";
// registerPushSubscription — Register/update a web push subscription.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint) return Response.json({ error: "subscription with endpoint is required" }, { status: 400 });

    // One browser = one endpoint = one account. When someone else signs in on this device and switches push on, the
    // previous account's row for it is removed, so this device no longer gets that account's pushes.
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint).neq("user_id", user.id);

    const { data: existing } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", user.id).eq("endpoint", subscription.endpoint);

    if (existing && existing.length > 0) {
      const { data: updated } = await supabaseAdmin.from("push_subscriptions").update({
        p256dh_key: subscription.keys?.p256dh || existing[0].p256dh_key,
        auth_key: subscription.keys?.auth || existing[0].auth_key
      }).eq("id", existing[0].id).select("*").single();
      return Response.json({ success: true, subscription: updated });
    }

    const { data: created } = await supabaseAdmin.from("push_subscriptions").insert({
      user_id: user.id, created_by_id: user.id, platform: "web", endpoint: subscription.endpoint,
      p256dh_key: subscription.keys?.p256dh || "", auth_key: subscription.keys?.auth || ""
    }).select("*").single();

    return Response.json({ success: true, subscription: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));