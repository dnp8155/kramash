import { useMemo } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Logo from "@/components/common/Logo";
import InstallGuide from "@/components/common/InstallGuide";
import { detectDevice } from "@/lib/deviceDetect";
import { useT } from "@/hooks/useT";

// Install guide as a sheet (phones) / modal (desktop), opening on the device the visitor is on.
export default function InstallDialog({ open, onOpenChange, canInstall = false, onInstall }) {
  const t = useT();
  const env = useMemo(() => detectDevice(), []);
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="sm:max-w-lg">
        <AppDialogHeader>
          <div className="flex items-center gap-3 pr-10">
            <Logo size={44} className="rounded-xl border border-border bg-card" />
            <div className="min-w-0">
              <AppDialogTitle>{t("Install Kramasha")}</AppDialogTitle>
              <AppDialogDescription className="pr-0">
                {t("We detected")} <span className="font-medium text-foreground">{env.label}</span>
              </AppDialogDescription>
            </div>
          </div>
        </AppDialogHeader>

        <AppDialogBody>
          <InstallGuide canInstall={canInstall} onInstall={onInstall} resetKey={open} tabsId="install-family-dialog" onDone={() => onOpenChange(false)} />
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("Got it")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
