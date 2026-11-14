// Message log: what was sent to a client, on which channel, and how it went (see migration 0055).
import { base44 } from "@/api/base44Client";

export const CHANNEL_LABEL = { email: "Email", whatsapp: "WhatsApp" };

// The most useful single status for a row, newest signal first.
export function describeMessageStatus(m) {
  if (m.status === "failed") return { label: "Failed", tone: "destructive" };
  if (m.status === "ready") return { label: "Ready to send", at: m.created_at, tone: "primary" }; // a due WhatsApp message waiting for the studio
  if (m.replied_at) return { label: "Replied", at: m.replied_at, tone: "success" };
  if (m.clicked_at) return { label: "Link clicked", at: m.clicked_at, tone: "success" };
  if (m.opened_at) return { label: "Likely opened", at: m.opened_at, tone: "primary" };
  if (m.delivered_at || m.status === "delivered") return { label: "Delivered", at: m.delivered_at || m.sent_at, tone: "primary" };
  if (m.status === "sent") return { label: "Sent", at: m.sent_at || m.created_at, tone: "primary" };
  return { label: "Shared", at: m.created_at, tone: "muted" }; // WhatsApp opened, not confirmed sent
}

export async function logMessage({ workspaceId, eventId, clientId, channel, templateId, templateName, recipient, subject, body, status = "shared" }) {
  return base44.entities.MessageLog.create({
    workspace_id: workspaceId,
    event_id: eventId || null,
    client_id: clientId || null,
    channel,
    template_id: templateId || null,
    template_name: templateName || null,
    recipient: recipient || null,
    subject: subject || null,
    body: body || null,
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}

export async function listEventMessages(workspaceId, eventId) {
  const rows = await base44.entities.MessageLog.filter({ workspace_id: workspaceId, event_id: eventId }, "-created_date", 100);
  return (rows || []).filter((m) => m.status !== "dismissed");
}

export async function listWorkspaceMessages(workspaceId, limit = 300) {
  const rows = await base44.entities.MessageLog.filter({ workspace_id: workspaceId }, "-created_date", limit);
  return (rows || []).filter((m) => m.status !== "dismissed");
}

// The studio opened a ready WhatsApp message: it is now "Shared", like any other WhatsApp share.
export async function markMessageShared(id) {
  return base44.entities.MessageLog.update(id, { status: "shared" });
}

// The studio closed a ready WhatsApp message without sending it: it leaves Activity and its bell notification is
// removed. The row stays (status "dismissed") so the automation never recreates it.
export async function dismissReadyMessage(m) {
  await base44.entities.MessageLog.update(m.id, { status: "dismissed" });
  if (!m.dedupe_key) return;
  try {
    const notifs = await base44.entities.Notification.filter({ workspace_id: m.workspace_id, dedupe_key: m.dedupe_key }, "-created_date", 5);
    await Promise.all((notifs || []).map((n) => base44.entities.Notification.delete(n.id)));
  } catch { /* the message is already closed; a leftover notification is harmless */ }
}

export async function markMessageSent(id) {
  return base44.entities.MessageLog.update(id, { status: "sent", sent_at: new Date().toISOString() });
}

// ---- Scheduled messages ("Send later") ----

export async function scheduleMessage({ workspaceId, eventId, clientId, channel, templateId, templateName, subject, body, sendAt }) {
  return base44.entities.ScheduledMessage.create({
    workspace_id: workspaceId,
    event_id: eventId || null,
    client_id: clientId,
    channel,
    template_id: templateId || null,
    template_name: templateName || null,
    subject: subject || null,
    body,
    send_at: sendAt,
  });
}

export async function listEventScheduled(workspaceId, eventId) {
  return base44.entities.ScheduledMessage.filter({ workspace_id: workspaceId, event_id: eventId, status: "pending" }, "send_at", 50);
}

// How many messages are still waiting to be sent on a channel (asked before that channel is disconnected).
export async function countPendingScheduled(workspaceId, channel) {
  const rows = await base44.entities.ScheduledMessage.filter({ workspace_id: workspaceId, channel, status: "pending" }, "send_at", 100);
  return (rows || []).length;
}

export async function cancelScheduledMessage(id) {
  return base44.entities.ScheduledMessage.update(id, { status: "cancelled" });
}
