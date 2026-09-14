import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { Bell, Send, Loader2, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import {
  isPushSupported,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  isCurrentlySubscribed,
} from "@/lib/pushService";

export default function NotificationsSection() {
  const { toast } = useToast();
  const pushSupported = isPushSupported();
  const [pushOn, setPushOn] = useState(false);
  const [vapidAvailable, setVapidAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [prefs, setPrefs] = useState({
    event_reminders: true,
    payment_dues: true,
    general: true,
  });

  // Check current subscription state
  const checkState = useCallback(async () => {
    if (!pushSupported) return;
    const subscribed = await isCurrentlySubscribed();
    setPushOn(subscribed);
    const vapid = await getVapidPublicKey();
    setVapidAvailable(!!vapid);
  }, [pushSupported]);

  useEffect(() => {
    checkState();
    // Load notification preferences from user data
    base44.auth.me().then((u) => {
      const data = u?.data || {};
      if (data.notif_prefs) {
        try {
          setPrefs(JSON.parse(data.notif_prefs));
        } catch {
          // ignore
        }
      }
    }).catch(() => {});
  }, [checkState]);

  const handlePushToggle = async (v) => {
    if (v) {
      setLoading(true);
      try {
        await subscribeToPush();
        setPushOn(true);
        toast({ title: "Push notifications enabled" });
      } catch (e) {
        setPushOn(false);
        toast({
          title: "Could not enable push",
          description: e?.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await unsubscribeFromPush();
        setPushOn(false);
        toast({ title: "Push notifications disabled" });
      } catch (e) {
        toast({ title: "Failed to unsubscribe", description: e?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrefChange = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await base44.auth.updateMe({ notif_prefs: JSON.stringify(next) });
    } catch {
      // ignore — non-critical
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await sendTestNotification();
      const data = res?.data || res;
      toast({
        title: `Test sent (${data?.sent || 0} delivered, ${data?.failed || 0} failed)`,
        description: data?.failed > 0 && data?.sent === 0 ? "No push subscriptions active. Enable push first." : undefined,
      });
    } catch (e) {
      toast({ title: "Test failed", description: e?.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-5">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Bell className="w-4 h-4 text-primary" /> Notifications
      </h3>

      {/* Push notifications */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-foreground">Browser push notifications</span>
          {pushSupported ? (
            <Toggle checked={pushOn} onChange={handlePushToggle} label="Push" disabled={loading} />
          ) : (
            <span className="text-xs text-muted-foreground">Not supported</span>
          )}
        </div>
        {pushSupported && vapidAvailable === false && (
          <div className="flex items-start gap-2 mt-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Web push is not configured yet. Set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
              secrets in dashboard settings to enable browser push. Native mobile push works
              independently.
            </span>
          </div>
        )}
        {pushSupported && pushOn && vapidAvailable && (
          <div className="flex items-start gap-2 mt-2 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Web push is active on this device.</span>
          </div>
        )}
      </div>

      {/* Native push info */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" /> Native mobile push
        </span>
        <span className="text-xs text-muted-foreground">Active when app is installed</span>
      </div>

      {/* Per-category toggles */}
      <div className="pt-3 border-t border-border space-y-3">
        <span className="text-xs font-medium text-muted-foreground">Notification categories</span>
        <PrefToggle label="Event reminders" checked={prefs.event_reminders} onChange={(v) => handlePrefChange("event_reminders", v)} />
        <PrefToggle label="Payment dues" checked={prefs.payment_dues} onChange={(v) => handlePrefChange("payment_dues", v)} />
        <PrefToggle label="General updates" checked={prefs.general} onChange={(v) => handlePrefChange("general", v)} />
      </div>

      {/* Test notification */}
      <div className="pt-3 border-t border-border">
        <Button variant="outline" size="sm" disabled={testing || !pushOn} onClick={handleTest}>
          {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Send className="w-3.5 h-3.5" /> Send test notification</>}
        </Button>
      </div>
    </div>
  );
}

function PrefToggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}