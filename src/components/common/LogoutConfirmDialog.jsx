import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, Loader2 } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

export default function LogoutConfirmDialog({ open, onOpenChange }) {
  const t = useT();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout(true);
      // Success leaves the page, so the spinner stays until it changes (no flicker of the button re-enabling).
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="max-w-sm">
        <AppDialogHeader>
          <AppDialogTitle>{t("Log out?")}</AppDialogTitle>
          <AppDialogDescription>
            {t("You'll need to sign in again to access your workspace. Any unsaved changes may be lost.")}
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {t("Log out")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
