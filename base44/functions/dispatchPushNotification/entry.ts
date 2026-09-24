import { getUserFromRequest } from "../../shared/supabaseAdmin.js";

export async function handle(req, base44) {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 401, body: { error: "Unauthorized" } };

  const { user_id, title, content, action_label, action_url } = req.body || {};
  if (!user_id) return { status: 400, body: { error: "user_id required" } };
  if (!title || !content) return { status: 400, body: { error: "title and content required" } };

  try {
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id,
      title,
      content,
      action_label: action_label || null,
      action_url: action_url || null
    });
    return { status: 200, body: { sent: true } };
  } catch (err) {
    return { status: 500, body: { error: "Failed to send push notification", details: String(err?.message || err) } };
  }
}