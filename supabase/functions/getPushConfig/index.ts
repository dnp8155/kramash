import { withCors } from "../_shared/cors.ts";
// getPushConfig — Returns VAPID public key for web push subscription.
import { getUserFromRequest } from "../_shared/supabaseClient.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    return Response.json({ vapidPublicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));