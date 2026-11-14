import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

export default function BackConfirmDialog({ open, onStay, onLeave }) {
  const t = useT();
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onStay()}>
      <AppDialogContent maxWidth="max-w-sm">
        <AppDialogHeader>
          <AppDialogTitle>{t("Leave this page?")}</AppDialogTitle>
          <AppDialogDescription>
            {t("You have unsaved changes that will be lost. Are you sure you want to go back?")}
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogFooter>
          <Button variant="outline" onClick={onStay}>
            {t("Stay")}
          </Button>
          <Button variant="destructive" onClick={onLeave}>
            {t("Leave")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}