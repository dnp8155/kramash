import { useState } from "react";
import {
  MonitorSmartphone, CheckCircle2, RefreshCw, Loader2, Shield, Sparkles,
  KeyRound, CalendarClock, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, CalendarDays, Link2,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen, History, ChevronRight, Palette, Mail, Printer, Crown, Smartphone, Share2,
} from "lucide-react";
import Button from "@/components/common/Button";
import InstallGuide from "@/components/common/InstallGuide";
import Logo from "@/components/common/Logo";
import { APP_CONFIG, getVersionString } from "@/lib/appConfig";
import { useInstallPrompt, useServiceWorkerUpdate, usePwaDisplayMode } from "@/hooks/usePWA";
import { RELEASE_NOTES } from "@/constants/releaseNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

// Icon names referenced from constants/releaseNotes.js notes — kept as a
// lookup so the data file can stay plain strings/objects, not components.
// Mirrors WhatsNewDialog.jsx's map (same data source, same icon set).
const fmtReleaseDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const NOTE_ICONS = {
  KeyRound, CalendarClock, Sparkles, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, CalendarDays, Link2,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen,
  Palette, Mail, Printer, Crown, Smartphone, Share2,
};

export default function AppUpdates() {
  usePageTitle("App Updates");
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-card border border-border rounded-[15px] p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
          <Logo size={44} />
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

      {updateAvailable && (
        <div className="bg-primary text-primary-foreground border border-primary rounded-[15px] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            A new version of Kramasha is available.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-[15px] p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4" /> Install App
          </h3>
          {isPwaInstalled || installed ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              Kramasha is installed on this device.
            </div>
          ) : (
            <>
              <InstallGuide compact canInstall={canInstall} onInstall={promptInstall} tabsId="install-family-page" />
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-[15px] p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" /> App Lock
          </h3>
          <p className="text-sm text-muted-foreground">
            {appLockAvailable
              ? "Require a password or passkey (Face ID, Touch ID, security key) to open the app."
              : "Require a password to open the app. Passkey unlock isn't supported on this device/browser, but password-based App Lock still works."}
            {" "}Set it up in Preferences → Security.
          </p>
        </div>

        <div className="bg-card border border-border rounded-[15px] p-4 md:col-span-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Changelog / Release Notes
          </h3>
          <div className="divide-y divide-border">
            {RELEASE_NOTES.map((r, idx) => (
              <details key={r.version} open={idx === 0} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  <span className="text-sm font-semibold text-foreground">v{r.version}</span>
                  {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Latest</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{fmtReleaseDate(r.date)}</span>
                </summary>
                <div className="space-y-3 mt-3 pl-6">
                  {r.notes.map((note, i) => {
                    if (typeof note === "string") {
                      return (
                        <div key={i} className="flex gap-2 text-sm text-foreground">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{note}</span>
                        </div>
                      );
                    }
                    const Icon = NOTE_ICONS[note.icon] || Sparkles;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground leading-tight">{note.title}</div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{note.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}