import { useState } from "react";
import Toggle from "@/components/common/Toggle";
import { usePlan } from "@/hooks/usePlan";
import { Bell, Crown } from "lucide-react";

export default function NotificationsSection() {
  const { plan } = usePlan();
  const remindersEnabled = !!plan?.limits?.reminders_enabled;
  const pushSupported = typeof window !== "undefined" && "Notification" in window;
  const [pushOn, setPushOn] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Notifications</h3>
      <div className="space-y-3">
        <ToggleRow label="In-app notifications" checked={true} onChange={() => {}} />
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Browser push notifications
          </span>
          {pushSupported ? (
            <Toggle
              checked={pushOn}
              onChange={async (v) => {
                if (v) {
                  const p = await Notification.requestPermission();
                  setPushOn(p === "granted");
                } else {
                  setPushOn(false);
                }
              }}
              label="Push notifications"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Not supported</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Event reminders</span>
          {remindersEnabled ? (
            <Toggle checked={true} onChange={() => {}} label="Event reminders" />
          ) : (
            <ProBadge />
          )}
        </div>
        <ToggleRow label="Subscription expiry reminders" checked={true} onChange={() => {}} />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">SMS / Email / WhatsApp</span>
          <span className="text-xs text-muted-foreground">Not available in Beta</span>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">
      <Crown className="w-3 h-3" /> Pro
    </span>
  );
}