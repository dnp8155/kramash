// Payments of a Completed / Settled job are locked (enforced in the database, migration 0051).
// These helpers drive the screens: hide Delete, ask for a reason when voiding, show friendly errors.

export const isEventLocked = (event) => !!event && (event.status === "completed" || event.settled === true);

// Database errors from the lock look like "LOCKED_EVENT: This job is completed…" — show just the sentence.
export function lockErrorMessage(err) {
  const raw = String(err?.data?.message || err?.data?.error || err?.message || "");
  const m = raw.match(/(?:LOCKED_EVENT_OWNER_ONLY|LOCKED_EVENT_DELETE|LOCKED_EVENT|VOID_REASON_REQUIRED):\s*(.*)$/s);
  return m ? m[1].trim() : raw;
}

export const isLockError = (err) => /LOCKED_EVENT|VOID_REASON_REQUIRED/.test(String(err?.data?.message || err?.data?.error || err?.message || ""));

// For screens that only have a transaction (e.g. the Financial page): look up its job and check the lock.
export async function isTransactionLocked(tx) {
  if (!tx?.event_id) return false;
  try {
    const { base44 } = await import("@/api/base44Client");
    return isEventLocked(await base44.entities.Event.get(tx.event_id));
  } catch { return false; }
}
