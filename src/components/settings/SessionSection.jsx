import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/common/Button";
import { LogOut } from "lucide-react";

export default function SessionSection() {
  const { logout } = useAuth();
  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Session</h3>
      <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
      <Button variant="destructive" onClick={() => logout(true)}>
        <LogOut className="w-4 h-4" /> Log out
      </Button>
    </div>
  );
}