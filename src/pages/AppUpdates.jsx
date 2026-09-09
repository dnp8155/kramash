import { useState } from "react";
import { RefreshCw, Check, Download, Smartphone, WifiOff, Lock, Loader2, Share } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { APP_CONFIG, CHANGELOG, TAG_STYLES } from "@/constants/app";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";

// Detect iOS (Safari) for install guidance.
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function AppUpdates() {
  const pwa = usePWA();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleCheckUpdates = async () => {
    setChecking(true);
    await pwa.checkForUpdates();
    setTimeout(() => setChecking(false), 1000);
  };

  const handleInstall = async () => {
    if (!pwa.canInstall) return;
    setInstalling(true);
    await pwa.promptInstall();
    setInstalling(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="App & Updates" description="Version info, app installation, and updates." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Version + Update */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /><CardTitle>Current Version</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">v{APP_CONFIG.version}</p>
              <p className="text-sm text-muted-foreground">Released {APP_CONFIG.releaseDate} · Kramashah Beta</p>
              {pwa.updateAvailable ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-warning">
                  <RefreshCw className="h-4 w-4" /> A new version is available
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" /> You're up to date
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {pwa.updateAvailable ? (
                <Button onClick={pwa.applyUpdate}>
                  <RefreshCw className="h-4 w-4" /> Update Now
                </Button>
              ) : (
                <Button variant="outline" onClick={handleCheckUpdates} disabled={checking}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Check for Updates
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {pwa.swSupported ? "Auto-update enabled" : "Updates apply on page reload"}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Install App */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /><CardTitle>Install App</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {pwa.isInstalled ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" /> Kramashah is installed on this device
              </div>
            ) : pwa.canInstall ? (
              <>
                <p className="text-sm text-muted-foreground">Install Kramashah as an app for quick access.</p>
                <Button className="w-full" onClick={handleInstall} disabled={installing}>
                  {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  {installing ? "Installing…" : "Install on this device"}
                </Button>
              </>
            ) : isIOS() ? (
              <>
                <p className="text-sm text-muted-foreground">
                  iOS doesn't support automatic install. Add Kramashah to your Home Screen manually:
                </p>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      Tap the <Share className="inline h-3.5 w-3.5" /> Share button in Safari
                    </li>
                    <li>Select <span className="font-medium text-foreground">Add to Home Screen</span></li>
                    <li>Tap <span className="font-medium text-foreground">Add</span></li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Install Kramashah as an app for quick access.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use your browser menu → <span className="font-medium text-foreground">Install app</span> or <span className="font-medium text-foreground">Add to Home Screen</span>.
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Offline */}
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${pwa.isOffline ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
              {pwa.isOffline ? <WifiOff className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pwa.isOffline ? "You're offline" : "You're online"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pwa.isOffline ? "Some features may be unavailable" : "All features available"}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* App Lock */}
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">App Lock</p>
              <p className="text-xs text-muted-foreground">Not available in Beta</p>
            </div>
          </CardBody>
        </Card>

        {/* PWA Status */}
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${pwa.swSupported ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pwa.swSupported ? "PWA Ready" : "PWA Unsupported"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pwa.swSupported ? "Installable & offline-capable" : "Browser doesn't support PWA"}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Changelog */}
      <Card>
        <CardHeader><CardTitle>Changelog</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {CHANGELOG.map((c) => (
              <div key={c.version} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="sm:w-28 shrink-0">
                  <p className="text-sm font-semibold text-foreground">v{c.version}</p>
                  <p className="text-xs text-muted-foreground">{c.date}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TAG_STYLES[c.tag]}`}>{c.tag}</span>
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}