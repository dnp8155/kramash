import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { workspaceTz, tzLabel } from "@/lib/workspaceTime";
import ProTag from "@/components/common/ProTag";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import { useFeatureGate } from "@/components/common/ProGate";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { Bell, Smartphone, Send, Loader2, Lock, RefreshCw, CalendarClock, Wallet, FileText, Crown, UserPlus, Check } from "lucide-react";
import { detectDevice } from "@/lib/deviceDetect";
import {
  isPushSupported,
  getPushSubscription,
  enablePushNotifications,
  disablePushNotifications,
  sendTestPushNotification,
} from "@/lib/pushNotifications";

const DEFAULT_PREFS = {
  in_app: true,
  push: true,
  events: true,
  quotations: true,
  invoices: true,
  leads: true,
  billing: true,
  reminder_days: "3",
  reminder_time: "10:00",
  event_day_time: "08:00",
};

// What the user can switch on/off. Each key is read where that notification is created
// (notificationService.js, generateNotifications, signQuotation) — a missing key counts as on.
const CATEGORIES = [
  { key: "events", icon: CalendarClock, title: "Events & projects", desc: "Reminders before an event or project starts" },
  { key: "invoices", icon: Wallet, title: "Payments & invoices", desc: "Payment milestones that are due or overdue" },
  { key: "leads", icon: UserPlus, title: "Leads & follow-ups", desc: "A reminder when a lead's follow-up date arrives" },
  { key: "quotations", icon: FileText, title: "Quotations", desc: "When a client signs and accepts a quotation" },
  { key: "billing", icon: Crown, title: "Plan & billing", desc: "Your subscription expiring or expired" },
];

// The server checks for due reminders on the hour and half hour (cron */30, in UTC; every timezone in Preferences is
// a whole or half hour off UTC). So a chosen time goes out at that check, or the next one: 10:15 → 10:30.
const fmt12 = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
function nextCheck(hhmm, tz) {
  const [h, m] = String(hhmm || "10:00").split(":").map((n) => parseInt(n, 10) || 0);
  const chosen = h * 60 + m;
  const sendAt = Math.min(Math.ceil(chosen / 30) * 30, 23 * 60 + 30);
  let nowMins = 0;
  try {
    const o = {};
    for (const p of new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date())) o[p.type] = p.value;
    nowMins = (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10);
  } catch { /* unknown zone: treat as start of day */ }
  return { day: nowMins < sendAt ? "today" : "tomorrow", at: fmt12(sendAt), rounded: sendAt !== chosen };
}

const readBlocked = () => typeof Notification !== "undefined" && Notification.permission === "denied";

function blockedHelp(family) {
  if (family === "ios") return "Open Settings → Notifications → Kramasha and allow notifications (the app must be added to your Home Screen).";
  if (family === "android") return "Tap the lock icon next to the address (or long-press the app icon → Site settings), open Permissions → Notifications, and choose Allow.";
  return "Click the lock icon at the left of the address bar, find Notifications, and switch it to Allow (or open Site settings → Notifications).";
}

export default function NotificationSection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [testSending, setTestSending] = useState(false);
  // Shows a short "Saved" tick next to the reminder times once the server has stored the change.
  const [savedKey, setSavedKey] = useState(null);
  const savedTimer = useRef(null);
  useEffect(() => () => clearTimeout(savedTimer.current), []);
  const { workspace } = useWorkspace();
  const tz = workspaceTz(workspace);
  const { workItemPlural } = useBusinessTerminology();
  const pushSupported = isPushSupported();
  const [pushBlocked, setPushBlocked] = useState(readBlocked);
  const { checkFeature, hasFeature, FeatureGateDialog } = useFeatureGate();
  // Push is a Pro feature. On Free the row is shown dimmed; a device that is already subscribed can still switch it off.
  const pushLocked = !hasFeature("notifications_enabled");

  useEffect(() => {
    async function loadPrefs() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        if (data?.notification_preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.notification_preferences });
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, [user]);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let status;
    navigator.permissions.query({ name: "notifications" }).then((s) => {
      status = s;
      s.onchange = () => setPushBlocked(readBlocked());
    }).catch(() => {});
    return () => { if (status) status.onchange = null; };
  }, []);

  useEffect(() => {
    if (!pushSupported) return;
    let cancelled = false;
    getPushSubscription().then((sub) => { if (!cancelled) setPushSubscribed(!!sub); });
    return () => { cancelled = true; };
  }, [pushSupported]);

  const updatePref = async (key, value) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: newPrefs })
        .eq("id", user.id);
      if (error) throw error;
      setSavedKey(key);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedKey(null), 2500);
      // Pages like Events read these from the signed-in user held in memory (e.g. the Reminders
      // red dot), so refresh it now — otherwise the change only shows after a full reload.
      checkUserAuth?.(false);
    } catch (err) {
      toast({
        title: "Failed to save preference",
        description: err?.message,
        variant: "destructive",
      });
      setPrefs(prefs);
    }
  };

  const handlePushToggle = async (value) => {
    if (value && !checkFeature("notifications_enabled", "Notifications")) return;
    setPushBusy(true);
    try {
      if (value) {
        await enablePushNotifications();
        setPushSubscribed(true);
      } else {
        await disablePushNotifications();
        setPushSubscribed(false);
      }
      await updatePref("push", value);
    } catch (err) {
      setPushBlocked(readBlocked());
      toast({
        title: value ? "Couldn't enable push notifications" : "Couldn't disable push notifications",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const result = await sendTestPushNotification(user.id);
      if (result?.skipped) {
        toast({ title: "Push notifications are off", description: "Turn on push notifications above first." });
      } else if (result?.sent > 0) {
        toast({ title: "Test notification sent", description: "Check this device in a moment." });
      } else {
        toast({ title: "No test notification sent", description: "Turn on push notifications on this device first.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to send test notification", description: err?.message, variant: "destructive" });
    } finally {
      setTestSending(false);
    }
  };

  // One choice: "" off, "time" at a set time of day, or 30/60/120/180 minutes before the start. Older saved keys still count.
  const eventDayWhen = String(prefs.event_day_when ?? (prefs.event_lead_minutes || (prefs.event_day_reminder ? "time" : "")));
  const remindersOn = prefs.events !== false || prefs.invoices !== false || prefs.leads !== false;
  const next = nextCheck(prefs.reminder_time, tz);
  const nextDay = nextCheck(prefs.event_day_time || "08:00", tz);
  const inApp = prefs.in_app !== false;
  const pushOn = !!prefs.push && pushSubscribed;
  const reminderStatus = !remindersOn
    ? "Reminders are off for every category below, so none will be sent."
    : pushOn && inApp
    ? "Delivered as a push notification on this device and in the in-app bell."
    : pushOn
    ? "Delivered as a push notification on this device."
    : inApp
    ? "Shown in the in-app bell. Turn on Push Notifications above to also get them on this device."
    : "Both delivery channels are off, so nothing will reach you. Turn one on under Delivery Channels.";

  if (loading) {
    return (<div className="space-y-3" aria-busy="true" aria-label="Loading settings"><Skeleton className="h-5 w-40" />{[0, 1].map((i) => (<Skeleton key={i} className="h-40 w-full rounded-[15px]" />))}</div>);
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      {/* Delivery */}
      <Card title="Delivery Channels" subtitle="Choose how you want to receive alerts.">
        <Row icon={Bell} title="In-App Notifications" desc="Receive alerts inside the app">
          <Toggle checked={prefs.in_app} onChange={(v) => updatePref("in_app", v)} />
        </Row>
        <Row
          icon={Smartphone}
          title={<span className="inline-flex items-center gap-2">Push Notifications{pushLocked && <ProTag />}</span>}
          dimmed={pushLocked && !(prefs.push && pushSubscribed)}
          onLocked={() => checkFeature("notifications_enabled", "Push Notifications")}
          desc={!pushSupported ? "Not supported on this device/browser" : prefs.push && pushSubscribed ? "Enabled on this device" : "Receive push alerts on your device"}
        >
          {pushBusy ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Toggle checked={!!prefs.push && pushSubscribed} onChange={handlePushToggle} disabled={!pushSupported || (pushLocked && !(prefs.push && pushSubscribed))} />
          )}
        </Row>
        {pushSupported && pushBlocked && !pushSubscribed && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground space-y-1.5">
            <p className="flex items-center gap-1.5 font-medium"><Lock className="w-3.5 h-3.5 text-warning" /> Notifications are blocked</p>
            <p className="text-muted-foreground">
              {blockedHelp(detectDevice().family)} Then come back and turn push on again.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" /> I've allowed it — reload
            </Button>
          </div>
        )}
      </Card>

      {/* Categories */}
      <Card title="Categories" subtitle="Choose which notifications you want, in the app and as push.">
        {CATEGORIES.map(({ key, icon, title, desc }) => (
          <Row key={key} icon={icon} title={title} desc={desc}>
            <Toggle checked={prefs[key] !== false} onChange={(v) => updatePref(key, v)} />
          </Row>
        ))}
      </Card>

      {/* Reminder timing */}
      <Card title="Reminder Timing" subtitle={`When to remind you about upcoming ${workItemPlural.toLowerCase()}, lead follow-ups and due payments. Choose which ones under Categories.`}>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground min-w-0">{reminderStatus}</p>
        </div>

        <div className={`space-y-4 ${remindersOn ? "" : "opacity-50 pointer-events-none"}`} aria-disabled={!remindersOn}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="reminder-days" className="text-xs font-medium text-muted-foreground">Remind me</label>
              <Select id="reminder-days" value={String(prefs.reminder_days || "3")} onChange={(e) => updatePref("reminder_days", e.target.value)} disabled={!remindersOn}>
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">7 days before</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reminder-time" className="text-xs font-medium text-muted-foreground">Time of day</label>
              <Input id="reminder-time" type="time" value={prefs.reminder_time || "10:00"} onChange={(e) => e.target.value && updatePref("reminder_time", e.target.value)} disabled={!remindersOn} />
            </div>
          </div>
          <SavedNote show={savedKey === "reminder_time" || savedKey === "reminder_days"}>
            Next check: <span className="font-medium text-foreground">{next.day} at {next.at}</span> ({tzLabel(tz)} time).
            {next.rounded && " Reminders go out on the hour and half hour, so this is the next check after your time."}
          </SavedNote>
        </div>

        <div className={`space-y-1.5 ${prefs.events === false ? "opacity-50 pointer-events-none" : ""}`}>
          <label htmlFor="event-day-when" className="text-xs font-medium text-muted-foreground">On the day of the event</label>
          <Select id="event-day-when" value={eventDayWhen} onChange={(e) => updatePref("event_day_when", e.target.value)} disabled={prefs.events === false}>
            <option value="">Don't remind me</option>
            <option value="time">At a time I choose</option>
            <option value="30">30 minutes before it starts</option>
            <option value="60">1 hour before it starts</option>
            <option value="120">2 hours before it starts</option>
            <option value="180">3 hours before it starts</option>
          </Select>
          {eventDayWhen !== "" && (
            <div className="space-y-1.5 pt-1">
              <label htmlFor="event-day-time" className="text-xs font-medium text-muted-foreground">
                {eventDayWhen === "time" ? "Time of day" : "If the event has no start time, remind me at"}
              </label>
              <Input id="event-day-time" type="time" value={prefs.event_day_time || "08:00"} onChange={(e) => e.target.value && updatePref("event_day_time", e.target.value)} disabled={prefs.events === false} />
              {eventDayWhen === "time" && (
                <SavedNote show={savedKey === "event_day_time" || savedKey === "event_day_when"}>
                  Next check: <span className="font-medium text-foreground">{nextDay.day} at {nextDay.at}</span> ({tzLabel(tz)} time).
                </SavedNote>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">One reminder for each day of the event. It uses that day's start time from the Day plan, or the event's start time. Needs “Events &amp; projects” switched on above.</p>
          {eventDayWhen !== "" && eventDayWhen !== "time" && (
            <p className="text-xs text-muted-foreground">Checks run on the hour and half hour, so it comes at the check just before your chosen time, never later. E.g. 1 hour before a 4:45 PM start arrives at 3:30 PM.</p>
          )}
        </div>

        <Button variant="outline" onClick={handleSendTest} disabled={testSending || !pushSubscribed || !prefs.push}>
          {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send a test notification
        </Button>
        {(!pushSubscribed || !prefs.push) && (
          <p className="text-xs text-muted-foreground -mt-2">Turn on Push Notifications above to send a test to this device.</p>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Sent at your chosen time even when the app is closed (the server checks on the hour and half hour, by the timezone in Profile &amp; Workspace). Events are reminded once they're within the days you pick; payments are reminded when due and again while overdue. If nothing is due that day, you won't get a notification. Reminders also appear in the bell inside the app.
        </p>
      </Card>

      {FeatureGateDialog}
    </div>
  );
}

// One line under a time setting: when the next check runs, plus a brief "Saved" tick after a change is stored.
function SavedNote({ show, children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <p className="min-w-0 flex-1">{children}</p>
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="inline-flex items-center gap-1 text-success font-medium shrink-0"
            role="status"
          >
            <Check className="w-3.5 h-3.5" /> Saved
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Same card + tile look as Billing & Plan (BillingSection.jsx).
function Card({ title, subtitle, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, title, desc, children, dimmed, onLocked }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg bg-muted/40 ${dimmed ? "opacity-60 cursor-pointer" : ""}`} onClick={dimmed ? onLocked : undefined}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className={dimmed ? "shrink-0 pointer-events-none" : "shrink-0"}>{children}</div>
    </div>
  );
}
