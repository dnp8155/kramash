import { MonitorSmartphone, AppWindow, WifiOff, RefreshCw, CheckCircle2, MinusCircle, Globe } from "lucide-react";
import InstallGuide from "@/components/common/InstallGuide";
import StatusRow from "@/components/common/StatusRow";
import StatusChip from "@/components/common/StatusChip";
import { useT } from "@/hooks/useT";

// Install App card for the App & Updates page. Same layout as the App Lock card: a status chip, then
// what is true on this device. Not installed yet → the step-by-step install guide instead.
export default function InstallStatusCard({ isPwaInstalled, installed, canInstall, promptInstall, updateAvailable }) {
  const t = useT();
  const isInstalled = !!(isPwaInstalled || installed);
  const offlineReady = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  return (
    <div className="bg-card border border-border rounded-[15px] p-4 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4" /> {t("Install App")}
        </h3>
        <StatusChip on={isInstalled}>{isInstalled ? t("Installed") : t("Not installed")}</StatusChip>
      </div>

      {isInstalled ? (
        <>
          <p className="text-xs text-muted-foreground">{t("Kramasha is installed on this device.")}</p>
          <div className="mt-2 divide-y divide-border">
            <StatusRow icon={isPwaInstalled ? AppWindow : Globe} label={t("Opening as")}>
              {isPwaInstalled
                ? <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t("App window")}</span>
                : <span className="text-muted-foreground">{t("Browser tab")}</span>}
            </StatusRow>
            <StatusRow icon={WifiOff} label={t("Works offline")}>
              {offlineReady
                ? <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Ready")}</span>
                : <span className="text-muted-foreground flex items-center gap-1"><MinusCircle className="w-3.5 h-3.5" /> {t("Not supported here")}</span>}
            </StatusRow>
            <StatusRow icon={RefreshCw} label={t("Updates")}>
              {updateAvailable
                ? <span className="text-primary">{t("Update available")}</span>
                : <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Up to date")}</span>}
            </StatusRow>
          </div>
        </>
      ) : (
        <div className="mt-2">
          <InstallGuide compact canInstall={canInstall} onInstall={promptInstall} tabsId="install-family-page" />
        </div>
      )}
    </div>
  );
}
