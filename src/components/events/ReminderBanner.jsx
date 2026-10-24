import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, CalendarClock, AlertCircle, History, X } from "lucide-react";
import { EASE, useReducedMotion } from "@/lib/motionVariants";
import { formatEventDates, isThisWeek, isUpcomingDate, timeAgoLabel } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { useT } from "@/hooks/useT";
import { useAuth } from "@/lib/AuthContext";
import { askConfirm } from "@/lib/confirmDialog";

const DISMISS_KEY = "event-reminders-dismissed";
const COUNT_KEY = "event-reminders-count";

function Row({ onOpen, onClose, closeLabel, children }) {
  return (
    <div className="flex items-center gap-4 py-3 first:pt-0">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left flex items-start gap-2 hover:text-foreground">{children}</button>
      {/* Separated from the row's tap area by a divider + gap so a thumb aimed at the row or the header chevron above doesn't hit it. */}
      <button onClick={onClose} aria-label={closeLabel} className="shrink-0 w-8 h-8 ml-1 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );
}

const readDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); } catch { return new Set(); }
};

export default function ReminderBanner({
  events = [],
  onEventClick,
  eventDueInfo = {},
  dueReminders = [],
  crossFYDue = null,
  pendingEvents = [],
  currency = "INR",
  onSwitchToAllYears,
  workspaceId,
  ready = true,
}) {
  const t = useT();
  const { user } = useAuth();
  // Preferences → Notifications → "Red dot on reminders" (on unless switched off).
  const showDot = user?.notification_preferences?.reminder_dot !== false;
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(readDismissed);

  // X on a reminder: confirm, then remember it so it never comes back in Reminders.
  const dismiss = useCallback(async (key, ev) => {
    ev?.stopPropagation();
    if (!await askConfirm(t("Remove this reminder? It won't show again in Reminders."))) return;
    setDismissed((prev) => {
      const next = new Set(prev).add(key);
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [t]);

  const reminders = events
    .filter((e) => !e.settled && isThisWeek(e.start_date) && isUpcomingDate(e.start_date) && e.status !== "cancelled" && !dismissed.has(`soon:${e.id}`))
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1));

  // Every event stays here from the moment it is added until all its dues are cleared.
  // Anything already listed as coming up / overdue is not repeated.
  const listedIds = new Set([...reminders.map((e) => e.id), ...dueReminders.map((d) => d.id)]);
  const added = pendingEvents.filter((p) => !listedIds.has(p.id) && !dismissed.has(`new:${p.id}`));

  const visibleDue = dueReminders.filter((d) => !dismissed.has(`due:${d.id}`));
  const showCrossFY = crossFYDue && !dismissed.has("crossfy");

  const totalCount = reminders.length + added.length + visibleDue.length + (showCrossFY ? 1 : 0);

  // The count depends on payment data that arrives a moment after the events do, so right after load it can
  // read too high and then drop. Until `ready`, show the count from the last visit (per workspace) instead,
  // then switch to the live one and remember it for next time.
  const countKey = `${COUNT_KEY}:${workspaceId || ""}`;
  const [savedCount] = useState(() => {
    try { const v = localStorage.getItem(countKey); return v === null ? null : Number(v); } catch { return null; }
  });
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(countKey, String(totalCount)); } catch { /* ignore */ }
  }, [ready, totalCount, countKey]);
  const shownCount = ready || savedCount === null ? totalCount : savedCount;

  return (
    <div className="bg-muted/60 border border-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3"
        aria-expanded={open}
      >
        <span className="relative shrink-0">
          <Bell className="w-4 h-4 text-foreground" />
          {showDot && shownCount > 0 && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-destructive border border-muted" />
          )}
        </span>
        <span className="text-sm font-medium text-foreground">{t("Reminders")}</span>
        {shownCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-[7px] bg-primary/10 text-primary">
            {shownCount}
          </span>
        )}
        <motion.span
          className="ml-auto w-8 flex items-center justify-center text-muted-foreground text-sm"
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="reminder-body"
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { height: { duration: 0.32, ease: EASE }, opacity: { duration: 0.22, ease: "easeOut" } }}
          className="overflow-hidden"
        >
        <div className="px-4 pb-3 text-sm text-muted-foreground">
          {totalCount === 0 ? (
            <p>{t("No pending reminders for this week.")}</p>
          ) : (
            <div className="divide-y divide-dashed divide-border">
              {reminders.map((e) => {
                const due = eventDueInfo[e.id]?.clientDue || 0;
                return (
                  <Row key={e.id} onOpen={() => onEventClick?.(e)} onClose={(ev) => dismiss(`soon:${e.id}`, ev)} closeLabel={t("Dismiss reminder")}>
                    <CalendarClock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground leading-snug">
                      <span className="font-semibold">{e.title}</span> {t("is coming up on")}{" "}
                      <span className="font-medium">{formatEventDates(e)}</span>.
                      {due > 0 && (
                        <>
                          {" "}
                          <span className="font-semibold">{formatMoney(due, currency)}</span> {t("pending from the client.")}
                        </>
                      )}
                    </span>
                  </Row>
                );
              })}

              {added.map((p) => (
                <Row key={p.id} onOpen={() => onEventClick?.(p.event)} onClose={(ev) => dismiss(`new:${p.id}`, ev)} closeLabel={t("Dismiss reminder")}>
                  <CalendarClock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground leading-snug">
                    <span className="font-semibold">{p.event.title}</span>
                    {p.event.start_date && <> ({formatEventDates(p.event)})</>}:
                    {p.clientDue > 0 && (
                      <>
                        {" "}
                        <span className="font-semibold">{formatMoney(p.clientDue, currency)}</span> {t("pending from the client.")}
                      </>
                    )}
                    {p.teamServiceDue > 0 && (
                      <>
                        {" "}
                        <span className="font-semibold">{formatMoney(p.teamServiceDue, currency)}</span> {t("due to team/service providers.")}
                      </>
                    )}
                  </span>
                </Row>
              ))}

              {visibleDue.map((d) => (
                <Row key={d.id} onOpen={() => onEventClick?.(d.event)} onClose={(ev) => dismiss(`due:${d.id}`, ev)} closeLabel={t("Dismiss reminder")}>
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-destructive leading-snug">
                    <span className="font-semibold">{d.name}</span> {t("still owes")}{" "}
                    <span className="font-semibold">{formatMoney(d.clientDue, currency)}</span> — {t("the event was")}{" "}
                    {timeAgoLabel(d.event.start_date)}.
                    {d.teamServiceDue > 0 && (
                      <>
                        {" "}
                        <span className="font-semibold">{formatMoney(d.teamServiceDue, currency)}</span> {t("also due to team/service providers for this event.")}
                      </>
                    )}
                  </span>
                </Row>
              ))}

              {showCrossFY && (
                <Row onOpen={onSwitchToAllYears} onClose={(ev) => dismiss("crossfy", ev)} closeLabel={t("Dismiss reminder")}>
                  <History className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-warning leading-snug">
                    <span className="font-semibold">{formatMoney(crossFYDue.total, currency)}</span> {t("still pending from")}{" "}
                    {crossFYDue.count} {crossFYDue.count === 1 ? t("finished event") : t("finished events")} {t("in")}{" "}
                    {crossFYDue.labels.join(", ")} — {t("switch financial year to chase them.")}
                  </span>
                </Row>
              )}
            </div>
          )}
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
