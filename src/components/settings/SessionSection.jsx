import { useState } from "react";
import Button from "@/components/common/Button";
import { LogOut } from "lucide-react";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";

export default function SessionSection() {
  const [showLogout, setShowLogout] = useState(false);
  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Session</h3>
      <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
      <Button variant="destructive" onClick={() => setShowLogout(true)}>
        <LogOut className="w-4 h-4" /> Log out
      </Button>
      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} />
    </div>
  );
}