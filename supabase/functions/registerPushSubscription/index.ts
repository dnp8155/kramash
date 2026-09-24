// registerPushSubscription — Register/update a web push subscription.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint) return Response.json({ error: "subscription with endpoint is required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", user.id).eq("endpoint", subscription.endpoint);

    if (existing && existing.length > 0) {
      const { data: updated } = await supabaseAdmin.from("push_subscriptions").update({
        p256dh_key: subscription.keys?.p256dh || existing[0].p256dh_key,
        auth_key: subscription.keys?.auth || existing[0].auth_key
      }).eq("id", existing[0].id).select("*").single();
      return Response.json({ success: true, subscription: updated });
    }

    const { data: created } = await supabaseAdmin.from("push_subscriptions").insert({
      user_id: user.id, platform: "web", endpoint: subscription.endpoint,
      p256dh_key: subscription.keys?.p256dh || "", auth_key: subscription.keys?.auth || ""
    }).select("*").single();

    return Response.json({ success: true, subscription: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});