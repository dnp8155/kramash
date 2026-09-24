import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };

  const { endpoint, keys, p256dh, auth } = req.body || {};
  if (!endpoint) return { status: 400, body: { error: "endpoint required" } };

  const existing = await base44.asServiceRole.entities.PushSubscription.filter(
    { user_id: user.id, endpoint }, "-created_date", 1
  );

  if (existing && existing.length > 0) {
    return { status: 200, body: { registered: true, existing: true, id: existing[0].id } };
  }

  const created = await base44.asServiceRole.entities.PushSubscription.create({
    user_id: user.id,
    endpoint,
    p256dh: p256dh || keys?.p256dh || "",
    auth: auth || keys?.auth || "",
    status: "active"
  });

  return { status: 200, body: { registered: true, existing: false, id: created.id } };
}