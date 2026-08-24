// App & Updates — connected to real PWA state, version, and update detection.
import { useState, useEffect } from "react";
import { Smartphone, Download, CheckCircle2, RefreshCw, Loader2, Shield, Bell, Info, Share } from "lucide-react";
import Button from "@/components/common/Button";
import { APP_CONFIG, getVersionString } from "@/lib/appConfig";
import { useInstallPrompt, useServiceWorkerUpdate, usePwaDisplayMode } from "@/hooks/usePWA";

export default function AppUpdates() {
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const { canInstall, installed, isIOS, needsIOSGuidance, promptInstall } = useInstallPrompt();
  const { updateAvailable, applyUpdate, installing: swInstalling } = useServiceWorkerUpdate();
  const isPwaInstalled = usePwaDisplayMode();
  const appLockAvailable = APP_CONFIG.features.appLock.available;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setChecking(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-4">
      {/* App info */}
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{APP_CONFIG.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{getVersionString()}</p>
        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-success">
          <CheckCircle2 className="w-4 h-4" />
          {updateAvailable ? "Update available" : "You're up to date"}
        </div>
        <Button variant="outline" className="mt-4" onClick={handleCheckUpdates} disabled={checking}>
          {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><RefreshCw className="w-4 h-4" /> Check for Updates</>}
        </Button>
      </div>

      {/* Update available */}
      {updateAvailable && (
        <div className="bg-primary text-primary-foreground border border-primary rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            A new version of Kramashah is available.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={applyUpdate}
            disabled={swInstalling}
          >
            {swInstalling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : "Update Now"}
          </Button>
        </div>
      )}

      {/* Install / PWA status */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Install App</h3>
        {isPwaInstalled || installed ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Kramashah is installed on this device.
          </div>
        ) : needsIOSGuidance ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To install on iPhone/iPad:
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground pl-4">
              <li>1. Tap the <Share className="w-3.5 h-3.5 inline mx-0.5" /> Share button in Safari</li>
              <li>2. Select "Add to Home Screen"</li>
              <li>3. Tap "Add" to install Kramashah</li>
            </ol>
          </div>
        ) : canInstall ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Install Kramashah as an app on your device.</p>
            <Button variant="primary" size="sm" onClick={handleInstall} disabled={installing}>
              {installing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing…</> : <><Download className="w-3.5 h-3.5" /> Install</>}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4 shrink-0" />
            <span>Use your browser menu → "Install app" or "Add to Home Screen" to install.</span>
          </div>
        )}
      </div>

      {/* App Lock (WebAuthn) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" /> App Lock
        </h3>
        {appLockAvailable ? (
          <p className="text-sm text-muted-foreground">
            Secure device authentication (WebAuthn/passkey) is available on this device. App Lock setup will be available in a future update.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Secure biometric app lock (WebAuthn) is not supported on this device/browser. This feature requires a compatible device with Face ID, Touch ID, or a security key.
          </p>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </h3>
        {notifPermission === "granted" ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" /> Browser notifications are enabled.
          </div>
        ) : notifPermission === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Update your browser settings to allow notifications from Kramashah.
          </p>
        ) : notifPermission === "unsupported" ? (
          <p className="text-sm text-muted-foreground">Browser notifications are not supported on this device.</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Enable browser notifications for event and subscription reminders.</p>
            <Button variant="outline" size="sm" onClick={handleEnableNotifications}>Enable</Button>
          </div>
        )}
      </div>

      {/* Release notes */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Release Notes</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• PWA install, offline shell, and update detection.</li>
          <li>• Phone OTP architecture with provider configuration support.</li>
          <li>• Subscription payment gateway foundation (Stripe).</li>
          <li>• Excel/CSV export for Events, Clients, Team, and Financial activity.</li>
          <li>• In-app notifications for event reminders and subscription expiry.</li>
          <li>• Workspace logo upload and branded quotation PDF.</li>
        </ul>
      </div>

      {/* Third-party disclaimer */}
      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground">{APP_CONFIG.thirdPartyCostDisclaimer}</p>
      </div>
    </div>
  );
}