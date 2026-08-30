import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useT } from "@/hooks/useT";

/**
 * Confirmation dialog shown when a user tries to leave a form with unsaved
 * changes. "Stay" keeps them on the page; "Leave" discards and navigates back.
 */
export default function BackConfirmDialog({ open, onStay, onLeave }) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onStay()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Leave this page?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("You have unsaved changes that will be lost. Are you sure you want to go back?")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay} className="mt-0">
            {t("Stay")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("Leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}