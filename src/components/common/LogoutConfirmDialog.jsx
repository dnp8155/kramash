import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { LogOut, Loader2 } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";

export default function LogoutConfirmDialog({ open, onOpenChange }) {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout(true);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="max-w-sm">
        <AppDialogHeader>
          <AppDialogTitle>Log out?</AppDialogTitle>
          <AppDialogDescription>
            You'll need to sign in again to access your workspace. Any unsaved changes may be lost.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Log out
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
