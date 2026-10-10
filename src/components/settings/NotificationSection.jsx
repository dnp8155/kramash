import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import { useFeatureGate } from "@/components/common/ProGate";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { Bell, Smartphone, Send, Loader2, Lock, RefreshCw, CalendarClock, Wallet, FileText, Crown } from "lucide-react";
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
  billing: true,
  reminder_dot: true,
  reminder_days: "3",
  reminder_time: "10:00",
};

// What the user can switch on/off. Each key is read where that notification is created
// (notificationService.js, generateNotifications, signQuotation) — a missing key counts as on.
const CATEGORIES = [
  { key: "events", icon: CalendarClock, title: "Events & projects", desc: "Reminders before an event or project starts" },
  { key: "invoices", icon: Wallet, title: "Payments & invoices", desc: "Payment milestones that are due or overdue" },
  { key: "quotations", icon: FileText, title: "Quotations", desc: "When a client signs and accepts a quotation" },
  { key: "billing", icon: Crown, title: "Plan & billing", desc: "Your subscription expiring or expired" },
];

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
  const pushSupported = isPushSupported();
  const [pushBlocked, setPushBlocked] = useState(readBlocked);
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

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

  const remindersOn = prefs.events !== false || prefs.invoices !== false;
  const inApp = prefs.in_app !== false;
  const pushOn = !!prefs.push && pushSubscribed;
  const reminderStatus = !remindersOn
    ? "Event and payment reminders are both off in Categories, so none will be sent."
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
          title="Push Notifications"
          desc={!pushSupported ? "Not supported on this device/browser" : prefs.push && pushSubscribed ? "Enabled on this device" : "Receive push alerts on your device"}
        >
          {pushBusy ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Toggle checked={!!prefs.push && pushSubscribed} onChange={handlePushToggle} disabled={!pushSupported} />
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
      <Card title="Reminder Timing" subtitle="When to remind you about upcoming events and due payments. Choose which ones under Categories.">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground min-w-0">{reminderStatus}</p>
        </div>

        <Row icon={Bell} title="Red dot on reminders" desc="Show a red dot on the Reminders bell on the Events page when something is listed">
          <Toggle checked={prefs.reminder_dot !== false} onChange={(v) => updatePref("reminder_dot", v)} />
        </Row>

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
              <label htmlFor="reminder-time" className="text-xs font-medium text-muted-foreground">Time of day (IST)</label>
              <Input id="reminder-time" type="time" value={prefs.reminder_time || "10:00"} onChange={(e) => e.target.value && updatePref("reminder_time", e.target.value)} disabled={!remindersOn} />
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={handleSendTest} disabled={testSending || !pushSubscribed || !prefs.push}>
          {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send a test notification
        </Button>
        {(!pushSubscribed || !prefs.push) && (
          <p className="text-xs text-muted-foreground -mt-2">Turn on Push Notifications above to send a test to this device.</p>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Checked once a day at your chosen time, even when the app is closed. Events are reminded once they're within the days you pick; payments are reminded when due and again while overdue. If nothing is due that day, you won't get a notification. Reminders also appear in the bell inside the app.
        </p>
      </Card>

      {FeatureGateDialog}
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

function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
