import { useEffect, useRef, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { usePlan } from "@/hooks/usePlan";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/hooks/useT";
import { isPushSupported, getPushSubscription, enablePushNotifications, disablePushNotifications } from "@/lib/pushNotifications";
import { isInstalledApp } from "@/lib/openInBrowser";
import { planPushChanges, shouldAskForPush } from "@/lib/pushPlanSync";

const askedKey = (userId) => `kramasha_push_asked_app:${userId}`; // installed app only (older browser-tab asks don't count)
const readAsked = (userId) => { try { return localStorage.getItem(askedKey(userId)) === "1"; } catch { return true; } };
const writeAsked = (userId, on) => { try { on ? localStorage.setItem(askedKey(userId), "1") : localStorage.removeItem(askedKey(userId)); } catch { /* storage off */ } };

// Keeps push in step with the plan (see lib/pushPlanSync.js) and, on Pro, asks each device once to turn push on.
// Owner only: notifications go to the workspace owner.
export default function PushPlanSync() {
  const t = useT();
  const { toast } = useToast();
  const { user, checkUserAuth } = useAuth();
  const { role } = useWorkspace();
  const { plan, planIsPlaceholder } = usePlan({ loadUsage: false });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const synced = useRef("");
  // Held in refs: refreshing the signed-in user can hand back a new checkUserAuth, which must not cancel a pending ask.
  const refreshUser = useRef(checkUserAuth);
  refreshUser.current = checkUserAuth;
  const alive = useRef(true);
  const timer = useRef(null);
  useEffect(() => () => { alive.current = false; clearTimeout(timer.current); }, []);

  // Unknown while loading, and while the plan shown is still the previous workspace's (placeholder): never act on it.
  const pushAllowed = plan && !planIsPlaceholder ? plan.limits?.notifications_enabled === true : null;
  const userId = user?.id;

  useEffect(() => {
    if (pushAllowed === null || !userId || role !== "owner") return;
    const runKey = `${userId}:${pushAllowed}`;
    if (synced.current === runKey) return;
    synced.current = runKey;
    clearTimeout(timer.current);
    const cancelled = () => !alive.current || synced.current !== runKey;

    (async () => {
      // 1. The account's setting follows the plan (fresh read, so another device's change is not overwritten).
      const { data, error: readError } = await supabase.from("profiles").select("notification_preferences").eq("id", userId).single();
      // Never write on a failed read: saving would wipe the other notification settings.
      if (readError || !data) { synced.current = ""; return; }
      let prefs = data.notification_preferences || {};
      const step = planPushChanges(prefs, pushAllowed);
      if (step) {
        prefs = { ...prefs, ...step.changes };
        const { error } = await supabase.from("profiles").update({ notification_preferences: prefs }).eq("id", userId);
        if (!error) refreshUser.current?.(false);
        if (step.unsubscribeDevice) await disablePushNotifications().catch(() => {});
      }
      // A new Pro period asks every device again.
      if (!pushAllowed) { writeAsked(userId, false); return; }

      // 2. Ask this device once, when nothing else is on screen (the Pro welcome, What's New…).
      const subscribed = !!(await getPushSubscription());
      const ask = shouldAskForPush({
        // Asked only inside the installed app: in a browser tab push is not what we offer (Preferences can still switch it on).
        pushAllowed, supported: isPushSupported() && isInstalledApp(), permission: typeof Notification !== "undefined" ? Notification.permission : "default",
        subscribed, prefs, askedBefore: readAsked(userId),
      });
      if (!ask || cancelled()) return;
      let tries = 0;
      const tryOpen = () => {
        if (cancelled()) return;
        // Never on top of another dialog: wait for it to close (up to 2 minutes), else try again next time the app opens.
        if (document.querySelector('[role="dialog"]')) { if (tries++ < 60) timer.current = setTimeout(tryOpen, 2000); return; }
        writeAsked(userId, true);
        setOpen(true);
      };
      timer.current = setTimeout(tryOpen, 3000);
    })().catch(() => {});
  }, [pushAllowed, userId, role]);

  const turnOn = async () => {
    setBusy(true);
    try {
      await enablePushNotifications();
      toast({ title: t("Push notifications are on"), description: t("You'll get them on this device. Change which ones in Preferences → Notifications.") });
      setOpen(false);
    } catch (err) {
      toast({ title: t("Couldn't turn on push notifications"), description: err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <AppDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <AppDialogContent maxWidth="max-w-sm">
        <AppDialogHeader className="items-center text-center border-b-0 pb-0">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
            <BellRing className="h-7 w-7" />
          </div>
          <AppDialogTitle className="pr-0">{t("Turn on push notifications?")}</AppDialogTitle>
          <AppDialogDescription className="pr-0">{t("Pro includes push notifications. Get reminders, new inquiries and client reviews on this device, even when Kramasha is closed.")}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogFooter>
          <Button onClick={turnOn} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{t("Turn on")}</Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>{t("Not now")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
