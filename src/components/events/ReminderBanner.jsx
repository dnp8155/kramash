import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, CalendarClock, AlertCircle, History } from "lucide-react";
import { EASE, useReducedMotion } from "@/lib/motionVariants";
import { formatEventDate, isThisWeek, isUpcomingDate, timeAgoLabel } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { useT } from "@/hooks/useT";

export default function ReminderBanner({
  events = [],
  onEventClick,
  eventDueInfo = {},
  dueReminders = [],
  crossFYDue = null,
  currency = "INR",
  onSwitchToAllYears,
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const reminders = events
    .filter((e) => isThisWeek(e.start_date) && isUpcomingDate(e.start_date) && e.status !== "cancelled")
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1));

  const totalCount = reminders.length + dueReminders.length + (crossFYDue ? 1 : 0);

  return (
    <div className="bg-muted/60 border border-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3"
        aria-expanded={open}
      >
        <span className="relative shrink-0">
          <Bell className="w-4 h-4 text-foreground" />
          {dueReminders.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />
          )}
        </span>
        <span className="text-sm font-medium text-foreground">{t("Reminders")}</span>
        {totalCount > 0 && (
          <span className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {totalCount}
          </span>
        )}
        <motion.span
          className="ml-auto text-muted-foreground text-sm"
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
                  <button
                    key={e.id}
                    onClick={() => onEventClick?.(e)}
                    className="w-full text-left flex items-start gap-2 py-2.5 first:pt-0 hover:text-foreground"
                  >
                    <CalendarClock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground leading-snug">
                      <span className="font-semibold">{e.title}</span> {t("is coming up on")}{" "}
                      <span className="font-medium">{formatEventDate(e.start_date, e.end_date)}</span>.
                      {due > 0 && (
                        <>
                          {" "}
                          <span className="font-semibold">{formatMoney(due, currency)}</span> {t("pending from the client.")}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}

              {dueReminders.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onEventClick?.(d.event)}
                  className="w-full text-left flex items-start gap-2 py-2.5 first:pt-0"
                >
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
                </button>
              ))}

              {crossFYDue && (
                <button
                  onClick={onSwitchToAllYears}
                  className="w-full text-left flex items-start gap-2 py-2.5 hover:text-foreground"
                >
                  <History className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-warning leading-snug">
                    <span className="font-semibold">{formatMoney(crossFYDue.total, currency)}</span> {t("still pending from")}{" "}
                    {crossFYDue.count} {crossFYDue.count === 1 ? t("finished event") : t("finished events")} {t("in")}{" "}
                    {crossFYDue.labels.join(", ")} — {t("switch financial year to chase them.")}
                  </span>
                </button>
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
