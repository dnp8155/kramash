import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import { useFeatureGate } from "@/components/common/ProGate";
import Button from "@/components/common/Button";
import { Bell, Smartphone, Send, Loader2, Lock, RefreshCw } from "lucide-react";
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
  reminder_days: "3",
  reminder_time: "10:00",
};

const readBlocked = () => typeof Notification !== "undefined" && Notification.permission === "denied";

function blockedHelp(family) {
  if (family === "ios") return "Open Settings → Notifications → Kramasha and allow notifications (the app must be added to your Home Screen).";
  if (family === "android") return "Tap the lock icon next to the address (or long-press the app icon → Site settings), open Permissions → Notifications, and choose Allow.";
  return "Click the lock icon at the left of the address bar, find Notifications, and switch it to Allow (or open Site settings → Notifications).";
}

export default function NotificationSection() {
  const { user } = useAuth();
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

  if (loading) {
    return (<div className="space-y-3" aria-busy="true" aria-label="Loading settings"><Skeleton className="h-5 w-40" />{[0, 1].map((i) => (<Skeleton key={i} className="h-40 w-full rounded-[15px]" />))}</div>);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Basic Delivery Settings */}
      <div className="bg-card border border-border rounded-[15px] p-5">
        <h3 className="text-sm font-semibold mb-1">Delivery Channels</h3>
        <p className="text-xs text-muted-foreground mb-4">Choose how you want to receive alerts.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">In-App Notifications</span>
                <span className="text-xs text-muted-foreground">Receive alerts inside the app</span>
              </div>
            </div>
            <Toggle checked={prefs.in_app} onChange={(v) => updatePref("in_app", v)} />
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">Push Notifications</span>
                <span className="text-xs text-muted-foreground">
                  {!pushSupported
                    ? "Not supported on this device/browser"
                    : prefs.push && pushSubscribed
                    ? "Enabled on this device"
                    : "Receive push alerts on your device"}
                </span>
              </div>
            </div>
            {pushBusy ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <Toggle checked={!!prefs.push && pushSubscribed} onChange={handlePushToggle} disabled={!pushSupported} />
            )}
          </div>

          {pushSupported && pushBlocked && !pushSubscribed && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground space-y-1.5 mt-2">
              <p className="flex items-center gap-1.5 font-medium"><Lock className="w-3.5 h-3.5 text-warning" /> Notifications are blocked</p>
              <p className="text-muted-foreground">
                {blockedHelp(detectDevice().family)} Then come back and turn push on again.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-3.5 h-3.5" /> I've allowed it — reload
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Event Reminders (Matching the requested design) */}
      <div className="bg-card border border-border rounded-[20px] p-5 shadow-sm">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="text-base font-semibold text-foreground">Payment & Event reminders</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enabled on this device — you'll receive payment and event reminders here.
            </p>
          </div>
          <Toggle checked={prefs.events} onChange={(v) => updatePref("events", v)} />
        </div>

        <button 
          onClick={handleSendTest} 
          disabled={testSending || !pushSubscribed}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Send a test notification
        </button>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Reminder timing</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">When</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={prefs.reminder_days || "3"}
                  onChange={(e) => updatePref("reminder_days", e.target.value)}
                >
                  <option value="1">1 day before event</option>
                  <option value="3">3 days before event</option>
                  <option value="7">7 days before event</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Time of day</label>
              <input 
                type="time" 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={prefs.reminder_time || "10:00"}
                onChange={(e) => updatePref("reminder_time", e.target.value)}
              />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Reminders are checked once a day at this time and sent from your workspace, so they reach you even when the app is closed. You're reminded when an event or payment is upcoming (per your choice above), and overdue balances are followed up again every few days until they're paid — so if nothing is due that day, there's no notification. Quiet days are normal.
          </p>
        </div>
      </div>

      {FeatureGateDialog}
    </div>
  );
}
