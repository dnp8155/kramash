import { base44 } from "@/api/base44Client";
import { todayISO } from "@/lib/dates";
import { supabase } from "@/lib/supabaseClient";

// Before migration 0076 the `dismissed` column doesn't exist; every query that uses it falls back to the old way.
const missingDismissed = (e) => /dismissed/i.test(e?.message || "") || e?.code === "42703" || e?.code === "PGRST204";

// Load notifications for the current user (newest first). Cleared ones (dismissed) are not shown.
// Accepts an already-known userId to skip a redundant auth.me() round trip
// (the caller almost always already has it from useAuth()); falls back to
// auth.me() only when it isn't passed.
export async function loadNotifications(limit = 50, userId = null, workspaceId = null) {
  const uid = userId || (await base44.auth.me())?.id;
  if (!uid) return [];
  // Only this workspace's notifications — a user in several workspaces must not see one workspace's data in another.
  const base = { user_id: uid, ...(workspaceId ? { workspace_id: workspaceId } : {}) };
  try {
    return (await base44.entities.Notification.filter({ ...base, dismissed: false }, "-created_date", limit)) || [];
  } catch (e) {
    if (!missingDismissed(e)) throw e;
    return (await base44.entities.Notification.filter(base, "-created_date", limit)) || [];
  }
}

// How many unread notifications this user has in the workspace — all of them, not only the ones loaded in the bell,
// so the bell, "Mark all read" and the app icon badge (which the server counts the same way) always agree.
export async function countUnreadNotifications(userId, workspaceId) {
  if (!userId || !workspaceId) return 0;
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("workspace_id", workspaceId).eq("read", false);
  if (error) throw error;
  return count || 0;
}

// Mark a notification as read.
export async function markNotificationRead(id) {
  await base44.entities.Notification.update(id, { read: true });
}

// Mark every unread notification of this user in the workspace as read, in one request on the server
// (not only the ones loaded in the bell, which shows the newest 50).
export async function markAllNotificationsRead(userId, workspaceId) {
  if (!userId || !workspaceId) return;
  await base44.entities.Notification.updateMany({ user_id: userId, workspace_id: workspaceId, read: false }, { read: true });
}

// "Clear": hide it from the bell. The row is kept (dismissed) so the same reminder is never made and pushed again.
export async function dismissNotification(id) {
  try {
    await base44.entities.Notification.update(id, { dismissed: true, read: true });
  } catch (e) {
    if (!missingDismissed(e)) throw e;
    await base44.entities.Notification.delete(id); // migration 0076 not run yet: the old behaviour
  }
}

// Delete a notification for good (reminders that no longer apply: the event was deleted, the payment was paid…).
export async function deleteNotification(id) {
  await base44.entities.Notification.delete(id);
}

// Create a single in-app notification for the current user.
// Dedup: skips if an unread notification with same type + related_entity_id exists.
// related_dates holds the actual relevant date(s) (e.g. an event's selected
// dates) SEPARATELY from the narrative message, so the UI can render them as
// chips formatted per the workspace's Date Format preference, instead of a
// raw "YYYY-MM-DD" baked into the sentence.
export async function createNotification({ workspace_id, type, title, message, related_entity_type = "", related_entity_id = "", related_dates = [] }) {
  try {
    const user = await base44.auth.me();
    if (!user) return null;

    // Dedup check — skip if unread notification of same type+entity already exists
    if (related_entity_id) {
      const existing = await base44.entities.Notification.filter(
        { user_id: user.id, type, related_entity_id, read: false },
        "-created_date", 1
      );
      if (existing && existing.length > 0) return null;
    }

    return await base44.entities.Notification.create({
      workspace_id,
      user_id: user.id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      related_dates,
      read: false,
    });
  } catch {
    return null;
  }
}

// Notifications are for the workspace owner only — nothing about the workspace goes to other members.
// Only a positively-identified non-owner is excluded; if the lookup fails we do not treat the user as a non-owner
// (that would silently drop their reminders on a network blip).
export async function isWorkspaceOwner(workspaceId, userId) {
  try {
    const [rows, ws] = await Promise.all([
      base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId, user_id: userId }),
      base44.entities.Workspace.get(workspaceId),
    ]);
    if (!ws) return true;
    return ws.owner_user_id === userId || rows?.[0]?.role === "owner";
  } catch {
    return true;
  }
}

// Preferences → Notifications → "When": how many days ahead an event or payment is reminded.
const reminderDays = (prefs) => Math.max(1, parseInt(prefs?.reminder_days, 10) || 3);

function eventReminderTitle(daysUntil, name) {
  const when = daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`;
  return `${when}: ${name}`;
}

// The three titles the server gives a payment reminder; refreshed here as the due date comes and goes.
const PAYMENT_TITLES = new Set(["Payment Coming Up", "Payment Due Today", "Payment Overdue"]);

// Generate notifications via the server edge function (single source of truth).
export async function generateNotifications(workspaceId) {
  try {
    if (!workspaceId) return;
    await supabase.functions.invoke("generateNotifications", {
      body: { workspace_id: workspaceId },
    });
  } catch {
    // Silent fail — notification generation is best-effort.
  }
}

const sameDates = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);

// Several callers (app open, the bell, data changes) ask for a sync. Calls made while one is running share it, and
// a plain call within a minute of the last finished one is skipped. `force` (the data really changed) always runs.
const SYNC_REST_MS = 60 * 1000;
const syncState = new Map(); // workspaceId -> { running: Promise|null, doneAt: number, again: boolean }

export function syncNotifications(workspaceId, { force = false } = {}) {
  if (!workspaceId) return Promise.resolve();
  const s = syncState.get(workspaceId) || { running: null, doneAt: 0, again: false };
  syncState.set(workspaceId, s);
  if (s.running) {
    // A change arrived during a run: run once more after it, so the change is not missed.
    if (force) s.again = true;
    return s.running;
  }
  if (!force && Date.now() - s.doneAt < SYNC_REST_MS) return Promise.resolve();
  s.running = runSync(workspaceId).finally(() => {
    s.running = null;
    s.doneAt = Date.now();
    if (s.again) { s.again = false; syncNotifications(workspaceId, { force: true }); }
  });
  return s.running;
}

// Bring existing event/payment notifications in line with the current data: drop reminders for
// events that were deleted, cancelled, completed or moved out of the reminder window, and refresh
// the title/dates of ones that still apply (e.g. the event was renamed or rescheduled). Then
// generate any newly due ones. Called when events/milestones change so the bell stays accurate.
async function runSync(workspaceId) {
  try {
    const user = await base44.auth.me();
    if (!user || !workspaceId) return;
    if ((user.notification_preferences || {}).in_app === false) return;

    const today = todayISO();
    const todayDT = new Date(today + "T00:00:00");
    const windowDays = reminderDays(user.notification_preferences);
    const existing = (await loadNotifications(100, user.id, workspaceId)).filter(
      (n) => n.workspace_id === workspaceId && (n.type === "event_reminder" || n.type === "payment_due")
    );

    // Reminders are for the owner only: clear any this user got earlier and stop.
    if (!(await isWorkspaceOwner(workspaceId, user.id))) {
      await Promise.all(existing.map((n) => deleteNotification(n.id)));
      return;
    }

    if (existing.length > 0) {
      // Only the events and milestones these reminders are about (never "the first 500": in a big workspace that
      // list missed upcoming ones, so their reminders were deleted and then made and pushed again).
      const eventIds = [...new Set(existing.filter((n) => n.type === "event_reminder").map((n) => n.related_entity_id).filter(Boolean))];
      const milestoneIds = [...new Set(existing.filter((n) => n.type === "payment_due").map((n) => n.related_entity_id).filter(Boolean))];
      const [events, milestones] = await Promise.all([
        eventIds.length ? base44.entities.Event.filter({ workspace_id: workspaceId, id: { $in: eventIds } }) : [],
        milestoneIds.length ? base44.entities.PaymentMilestone.filter({ workspace_id: workspaceId, id: { $in: milestoneIds } }) : [],
      ]);
      const eventById = new Map((events || []).map((e) => [e.id, e]));
      // A payment reminder also needs its event (settled events get no payment reminders).
      const moreEventIds = [...new Set((milestones || []).map((m) => m.event_id).filter((id) => id && !eventById.has(id)))];
      if (moreEventIds.length) {
        for (const e of (await base44.entities.Event.filter({ workspace_id: workspaceId, id: { $in: moreEventIds } })) || []) eventById.set(e.id, e);
      }
      const milestoneById = new Map((milestones || []).map((m) => [m.id, m]));

      const writes = [];
      for (const n of existing) {
        if (n.type === "event_reminder") {
          const ev = eventById.get(n.related_entity_id);
          const daysUntil = ev?.start_date
            ? Math.ceil((new Date(ev.start_date + "T00:00:00") - todayDT) / 86400000)
            : null;
          if (!ev || ev.status !== "upcoming" || ev.settled) {
            writes.push(deleteNotification(n.id));
            continue;
          }
          const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0 ? ev.event_dates : [ev.start_date];
          const moved = !sameDates([...(n.related_dates || [])].sort(), [...dates].sort());
          const inWindow = daysUntil !== null && daysUntil >= 0 && daysUntil <= windowDays;
          // A "Rescheduled" notice stays until it has been read, even outside the reminder window
          // (it used to vanish on the very next sync, i.e. the moment the bell was opened to look at it).
          const rescheduled = moved || (!n.read && /^Rescheduled/.test(n.title || ""));
          if (!inWindow && !rescheduled) {
            writes.push(deleteNotification(n.id)); // reminder window passed, nothing changed
            continue;
          }
          const name = ev.title || "";
          const title = inWindow
            ? `${rescheduled ? "Rescheduled · " : ""}${eventReminderTitle(daysUntil, name)}`
            : `Rescheduled: ${name}`;
          // The server's own message (with the place and the business's wording) is kept; only a move rewrites it.
          const patch = {};
          if (moved) Object.assign(patch, { message: `${name} has been moved to new date(s).`, related_dates: dates, read: false });
          if (n.title !== title) patch.title = title;
          if (Object.keys(patch).length) writes.push(base44.entities.Notification.update(n.id, patch));
        } else {
          const m = milestoneById.get(n.related_entity_id);
          const due = Number(m?.due_amount) || 0;
          const paid = Number(m?.paid_amount) || 0;
          if (!m || m.status === "paid" || due <= 0 || paid >= due || eventById.get(m.event_id)?.settled) {
            writes.push(deleteNotification(n.id));
            continue;
          }
          // "Payment Coming Up … due on 18 Nov" turns into "Payment Overdue … overdue since 18 Nov" once the day passes.
          if (m.due_date && PAYMENT_TITLES.has(n.title)) {
            const overdue = m.due_date < today;
            const title = overdue ? "Payment Overdue" : m.due_date === today ? "Payment Due Today" : "Payment Coming Up";
            if (title !== n.title) {
              const message = overdue ? String(n.message || "").replace(" due on ", " overdue since ") : n.message;
              writes.push(base44.entities.Notification.update(n.id, { title, message }));
            }
          }
        }
      }
      // Each write is a different notification row.
      await Promise.all(writes);
    }

    await generateNotifications(workspaceId);
  } catch {
    // Best-effort, same as generateNotifications.
  }
}
